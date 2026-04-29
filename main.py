from __future__ import annotations

import argparse
import asyncio
import importlib
import logging
import pathlib

import can
import yaml

from lib.can_manager import CANManager
from lib.drivers.base import MotorDriver
from lib.drivers.edulite05 import Edulite05Driver
from lib.drivers.generic import GenericDriver
from lib.drivers.m3508 import M3508Driver
from lib.sequence.engine import Sequence
from lib.server import RobotServer

logger = logging.getLogger(__name__)

_DRIVER_MAP: dict[str, type[MotorDriver]] = {
    "m3508": M3508Driver,
    "edulite05": Edulite05Driver,
    "generic": GenericDriver,
}

_CONFIG_DIR = pathlib.Path(__file__).resolve().parent / "config"
_DEFAULT_CONFIGS = ["main_hand.yaml", "sub_hand.yaml"]

# RobotServer.__init__ のキーワード引数デフォルトと一致させること。
# 値の変更は lib/server.py の RobotServer 既定値と同期する。
_DEFAULT_HEALTH: dict[str, float | int] = {
    "feedback_timeout_ms": 500.0,
    "temp_warning_c": 65.0,
    "temp_critical_c": 80.0,
    "tx_error_threshold": 96,
}


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="CBC2026 Team3 中央制御プログラム")
    parser.add_argument(
        "--config",
        nargs="*",
        help="config ファイルパス (デフォルト: config/main_hand.yaml config/sub_hand.yaml)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="CAN バスなしで起動 (mock バスを使用)",
    )
    parser.add_argument(
        "--host",
        default="0.0.0.0",
        help="サーバーバインドアドレス (デフォルト: 0.0.0.0)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8080,
        help="サーバーポート (デフォルト: 8080)",
    )
    return parser.parse_args()


def _load_config(path: pathlib.Path) -> dict:
    with open(path) as f:
        return yaml.safe_load(f)


def _load_health_config(configs: list[dict]) -> dict[str, float | int]:
    """全 config の health セクションを集約してしきい値辞書を返す。

    運用上の決定事項:
    - 最初に見つかった health セクションを基本値として採用する
    - 後続の config に異なる値があれば WARNING ログを出した上で最初の値を維持する
    - yaml に存在しないキーは _DEFAULT_HEALTH で補完する
      (segment-by-segment の部分上書きを許す)
    """
    result: dict[str, float | int] = dict(_DEFAULT_HEALTH)
    first_health: dict | None = None
    first_robot: str | None = None

    for cfg in configs:
        health = cfg.get("health")
        if not isinstance(health, dict):
            continue

        if first_health is None:
            first_health = health
            first_robot = cfg.get("robot_name")
            for key in _DEFAULT_HEALTH:
                if key in health:
                    result[key] = health[key]
            continue

        # 2 つ目以降の health セクション: 最初の値と比較して衝突を検出
        for key in _DEFAULT_HEALTH:
            first_val = first_health.get(key, _DEFAULT_HEALTH[key])
            this_val = health.get(key, _DEFAULT_HEALTH[key])
            if first_val != this_val:
                logger.warning(
                    "health.%s が config 間で不一致 (%s=%s, %s=%s)。前者を採用します。",
                    key,
                    first_robot,
                    first_val,
                    cfg.get("robot_name"),
                    this_val,
                )

    return result


def _create_bus(channel: str, *, dry_run: bool) -> can.Bus:
    if dry_run:
        return can.Bus(interface="virtual", channel=channel)
    return can.Bus(interface="socketcan", channel=channel)


def _setup_robot(config: dict, *, dry_run: bool) -> tuple[str, CANManager, dict[str, MotorDriver]]:
    """config dict からロボット名・CANManager・モータ群をセットアップする。"""
    robot_name: str = config["robot_name"]
    can_manager = CANManager()

    bus_map: dict[str, str] = config.get("can_buses", {})
    for bus_name, channel in bus_map.items():
        bus = _create_bus(channel, dry_run=dry_run)
        can_manager.add_bus(bus_name, bus)

    motors: dict[str, MotorDriver] = {}
    motor_configs: dict = config.get("motors") or {}
    for motor_name, motor_cfg in motor_configs.items():
        driver_type = motor_cfg["driver"]
        driver_cls = _DRIVER_MAP.get(driver_type)
        if driver_cls is None:
            logger.warning("未知のドライバタイプ: %s (スキップ)", driver_type)
            continue

        can_id = motor_cfg["can_id"]
        if isinstance(can_id, str):
            can_id = int(can_id, 0)

        motor = driver_cls(name=motor_name, can_id=can_id)
        bus_name = motor_cfg["bus"]
        can_manager.add_motor(bus_name, motor)
        motors[motor_name] = motor

    return robot_name, can_manager, motors


def _load_sequence(robot_name: str) -> Sequence | None:
    """robots/<robot_name>.py からシーケンスクラスを動的にロードする。"""
    module_name = f"robots.{robot_name}"
    try:
        module = importlib.import_module(module_name)
    except ModuleNotFoundError:
        logger.info("シーケンスモジュール %s が見つかりません。ダミーを使用します。", module_name)
        return None

    for attr_name in dir(module):
        attr = getattr(module, attr_name)
        if isinstance(attr, type) and issubclass(attr, Sequence) and attr is not Sequence:
            return attr(robot_name)

    logger.warning("モジュール %s に Sequence サブクラスが見つかりません。", module_name)
    return None


class _PlaceholderSequence(Sequence):
    """シーケンスが未実装のロボット用プレースホルダー。"""

    pass


async def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    args = _parse_args()

    if args.config:
        config_paths = [pathlib.Path(p) for p in args.config]
    else:
        config_paths = [_CONFIG_DIR / name for name in _DEFAULT_CONFIGS]

    # 1 パス目: yaml をすべて読み込み health しきい値だけを先に確定させる。
    # RobotServer 生成時にしきい値を渡す必要があるため、ロボット登録より先に
    # 全 config を辞書化しておく。
    loaded: list[tuple[pathlib.Path, dict]] = []
    for config_path in config_paths:
        if not config_path.exists():
            logger.warning("config ファイルが見つかりません: %s (スキップ)", config_path)
            continue
        loaded.append((config_path, _load_config(config_path)))

    health_thresholds = _load_health_config([cfg for _, cfg in loaded])
    logger.info("health しきい値: %s", health_thresholds)

    server = RobotServer(host=args.host, port=args.port, **health_thresholds)
    can_managers: list[CANManager] = []

    # 2 パス目: 既存の robot 登録ロジック
    for _config_path, config in loaded:
        robot_name, can_manager, motors = _setup_robot(config, dry_run=args.dry_run)
        can_managers.append(can_manager)

        seq = _load_sequence(robot_name)
        if seq is None:
            seq = _PlaceholderSequence(robot_name)

        server.add_robot(robot_name, seq, can_manager)
        logger.info(
            "ロボット登録: %s (モータ: %d 台)",
            robot_name,
            len(motors),
        )

    tasks: list[asyncio.Task] = []
    for mgr in can_managers:
        tasks.append(asyncio.create_task(mgr.run()))

    try:
        await server.start()
    except asyncio.CancelledError:
        pass
    finally:
        for mgr in can_managers:
            await mgr.shutdown()
        await server.cleanup()
        for task in tasks:
            task.cancel()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("終了")
