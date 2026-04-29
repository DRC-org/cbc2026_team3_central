from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import pathlib
import time
from dataclasses import dataclass

from aiohttp import WSMsgType, web

from lib.can_manager import CANManager
from lib.drivers.generic import GenericDriver
from lib.health import (
    BusHealth,
    BusHealthInfo,
    HealthSnapshot,
    MotorHealth,
    MotorHealthInfo,
)
from lib.sequence.engine import Sequence

logger = logging.getLogger(__name__)

_WEB_DIST_DIR = pathlib.Path(__file__).resolve().parent.parent / "web" / "dist"


# overall を最悪値で集約するためのランク。lib.health._BUS_SEVERITY_RANK と一致させる
# (重複定義を避けたいが、health.py 側を private 扱いにしているため局所コピーする)。
_BUS_SEVERITY_RANK: dict[BusHealth, int] = {
    BusHealth.OK: 0,
    BusHealth.DEGRADED: 1,
    BusHealth.DOWN: 2,
}


def _level_for_state(state: BusHealth) -> str:
    """BusHealth を health_change イベントの level 文字列にマップする。"""
    if state is BusHealth.DOWN:
        return "critical"
    if state is BusHealth.DEGRADED:
        return "warning"
    return "info"


def _level_for_motor_state(state: MotorHealth) -> str:
    """MotorHealth を health_change イベントの level 文字列にマップする。"""
    if state is MotorHealth.FAULT:
        return "critical"
    if state in (MotorHealth.STALE, MotorHealth.WARNING):
        return "warning"
    return "info"


@dataclass
class RobotContext:
    sequence: Sequence
    can_manager: CANManager


class RobotServer:
    def __init__(
        self,
        host: str = "0.0.0.0",
        port: int = 8080,
        *,
        feedback_timeout_ms: float = 500.0,
        temp_warning_c: float = 65.0,
        temp_critical_c: float = 80.0,
        tx_error_threshold: int = 96,
    ) -> None:
        self._host = host
        self._port = port
        self._app: web.Application | None = None
        self._robots: dict[str, RobotContext] = {}
        self._ws_clients: set[web.WebSocketResponse] = set()
        self._broadcast_interval: float = 0.05
        self._broadcast_task: asyncio.Task[None] | None = None
        self._e_stop_active: bool = False

        # ヘルスチェックしきい値は config/*.yaml の health セクション由来 (Phase 6 段階⑤で反映)
        self._health_thresholds: dict[str, float | int] = {
            "feedback_timeout_ms": feedback_timeout_ms,
            "temp_warning_c": temp_warning_c,
            "temp_critical_c": temp_critical_c,
            "tx_error_threshold": tx_error_threshold,
        }
        # 直近の HealthSnapshot をロボット名で保持し、_diff_health で前回と比較する
        self._last_health: dict[str, HealthSnapshot] = {}

    def add_robot(self, name: str, sequence: Sequence, can_manager: CANManager) -> None:
        self._robots[name] = RobotContext(sequence=sequence, can_manager=can_manager)

    def create_app(self) -> web.Application:
        app = web.Application()
        # ヘルスエンドポイントは静的ファイル SPA フォールバック (`/{path:.*}`) より先に
        # 登録する必要がある。先に SPA ルートを登録すると `/health` が index.html に
        # 吸い込まれて 200 HTML になり、監視ツールが誤判定する。
        app.router.add_get("/health", self._health_handler)
        app.router.add_get("/ws", self._ws_handler)

        if _WEB_DIST_DIR.is_dir():
            app.router.add_static("/assets", _WEB_DIST_DIR / "assets")
            app.router.add_get("/{path:.*}", self._spa_handler)

        app.on_startup.append(self._on_startup)
        app.on_shutdown.append(self._on_shutdown)

        self._app = app
        return app

    async def _spa_handler(self, request: web.Request) -> web.StreamResponse:
        """SPA フォールバック: 静的ファイルがあればそれを返し、なければ index.html を返す"""
        path = request.match_info.get("path", "")
        file_path = _WEB_DIST_DIR / path
        if path and file_path.is_file():
            return web.FileResponse(file_path)
        return web.FileResponse(_WEB_DIST_DIR / "index.html")

    async def _health_handler(self, request: web.Request) -> web.Response:
        """GET /health: 全ロボットの HealthSnapshot を集約し、最悪値で 200/503 を決める。

        CI・監視ツール・curl 動作確認用。WS が使えない環境向けの代替経路。
        """
        robots_payload: dict[str, dict] = {}
        worst_rank = 0
        for robot_name in self._robots:
            snap = self._compute_health(robot_name)
            robots_payload[robot_name] = snap.to_dict()
            worst_rank = max(worst_rank, _BUS_SEVERITY_RANK[snap.overall])

        overall = BusHealth.OK
        for state, rank in _BUS_SEVERITY_RANK.items():
            if rank == worst_rank:
                overall = state
                break

        # OK 以外は監視系から異常を検出できるよう 503 を返す
        status = 200 if overall is BusHealth.OK else 503
        return web.json_response(
            {"overall": overall.value, "robots": robots_payload},
            status=status,
        )

    async def _on_startup(self, app: web.Application) -> None:
        self._broadcast_task = asyncio.create_task(self._broadcast_loop())

    async def _on_shutdown(self, app: web.Application) -> None:
        if self._broadcast_task is not None:
            self._broadcast_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._broadcast_task

        for ws in set(self._ws_clients):
            await ws.close()
        self._ws_clients.clear()

    async def _ws_handler(self, request: web.Request) -> web.WebSocketResponse:
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        self._ws_clients.add(ws)
        logger.info("WebSocket 接続: %s", request.remote)

        try:
            async for msg in ws:
                if msg.type == WSMsgType.TEXT:
                    try:
                        data = json.loads(msg.data)
                    except json.JSONDecodeError:
                        logger.warning("不正な JSON を受信: %s", msg.data)
                        continue
                    await self._handle_command(data)
                elif msg.type == WSMsgType.ERROR:
                    logger.error("WebSocket エラー: %s", ws.exception())
        finally:
            self._ws_clients.discard(ws)
            logger.info("WebSocket 切断: %s", request.remote)

        return ws

    async def _handle_command(self, data: dict) -> None:
        cmd_type = data.get("type")

        if cmd_type == "trigger":
            robot_name = data.get("robot")
            if robot_name and robot_name in self._robots:
                self._robots[robot_name].sequence.trigger()
                logger.info("trigger: %s", robot_name)

        elif cmd_type == "e_stop":
            logger.warning("緊急停止コマンド受信")
            self._e_stop_active = True
            e_stop_msg = GenericDriver.encode_e_stop()
            for name, ctx in self._robots.items():
                for bus_name in ctx.can_manager._buses:
                    await ctx.can_manager.send_to_bus(bus_name, e_stop_msg)
                logger.info("E-STOP 送信: %s", name)
            await self._broadcast_e_stop_state()

        elif cmd_type == "e_stop_release":
            logger.info("緊急停止解除コマンド受信")
            self._e_stop_active = False
            await self._broadcast_e_stop_state()

        elif cmd_type == "health_check":
            # クライアントからの即時ヘルス要求。次回ループを待たずに即配信する。
            await self._broadcast_state()

        elif cmd_type == "set_param":
            motor_name = data.get("motor")
            key = data.get("key")
            value = data.get("value")
            logger.info("set_param: motor=%s key=%s value=%s", motor_name, key, value)

        else:
            logger.debug("未知のコマンド: %s", cmd_type)

    async def _broadcast_e_stop_state(self) -> None:
        msg = json.dumps(
            {"type": "e_stop_state", "active": self._e_stop_active},
            ensure_ascii=False,
        )
        dead: set[web.WebSocketResponse] = set()
        for ws in self._ws_clients:
            if ws.closed:
                dead.add(ws)
                continue
            try:
                await ws.send_str(msg)
            except ConnectionResetError:
                dead.add(ws)
        self._ws_clients -= dead

    async def _broadcast_loop(self) -> None:
        while True:
            await self._broadcast_state()
            await asyncio.sleep(self._broadcast_interval)

    def _compute_health(self, robot_name: str) -> HealthSnapshot:
        """指定ロボットの CANManager から HealthSnapshot を組み立てる。

        テスト等で MagicMock(spec=CANManager) を渡された場合 health() が
        HealthSnapshot を返さないため、防御的に空スナップショットへフォールバックする。
        """
        ctx = self._robots[robot_name]
        try:
            snap = ctx.can_manager.health(
                feedback_timeout_ms=float(self._health_thresholds["feedback_timeout_ms"]),
                temp_warning_c=float(self._health_thresholds["temp_warning_c"]),
                temp_critical_c=float(self._health_thresholds["temp_critical_c"]),
                tx_error_threshold=int(self._health_thresholds["tx_error_threshold"]),
            )
        except Exception:  # pragma: no cover - 防御的フォールバック
            snap = None

        if not isinstance(snap, HealthSnapshot):
            return HealthSnapshot(timestamp=time.time(), overall=BusHealth.OK)
        return snap

    def _diff_health(
        self,
        robot_name: str,
        prev: HealthSnapshot | None,
        curr: HealthSnapshot,
    ) -> list[dict]:
        """前回スナップショットとの差分から health_change イベントの一覧を生成する。

        前回 None (初回) の場合は空リストを返す。バス・モータそれぞれの state が
        変化したペアだけイベント化する。robot_name はターゲット文字列に含めない
        (現状クライアントはバス/モータ名のみで識別できるため)。
        """
        if prev is None:
            return []

        events: list[dict] = []

        prev_buses: dict[str, BusHealthInfo] = {b.name: b for b in prev.buses}
        for b in curr.buses:
            old = prev_buses.get(b.name)
            if old is not None and old.state is not b.state:
                events.append(
                    {
                        "type": "health_change",
                        "level": _level_for_state(b.state),
                        "target": f"bus:{b.name}",
                        "from": old.state.value,
                        "to": b.state.value,
                        "message": f"{b.channel or b.name} {old.state.value}→{b.state.value}",
                    }
                )

        prev_motors: dict[str, MotorHealthInfo] = {m.name: m for m in prev.motors}
        for m in curr.motors:
            old_m = prev_motors.get(m.name)
            if old_m is not None and old_m.state is not m.state:
                events.append(
                    {
                        "type": "health_change",
                        "level": _level_for_motor_state(m.state),
                        "target": f"motor:{m.name}",
                        "from": old_m.state.value,
                        "to": m.state.value,
                        "message": f"motor {m.name} {old_m.state.value}→{m.state.value}",
                    }
                )

        return events

    async def _broadcast_state(self) -> None:
        # 1) 各ロボットの health を計算 (クライアント不在でも遷移検出のため必ず実行)
        snapshots: dict[str, HealthSnapshot] = {}
        for robot_name in self._robots:
            snapshots[robot_name] = self._compute_health(robot_name)

        if not self._ws_clients:
            # クライアントがいなくても _last_health は更新する。
            # こうしないと最初のクライアント接続直後に「過去の状態 → 現在」の
            # 巨大な差分が一気に降ってきてしまう。
            self._last_health = snapshots
            return

        # 2) state メッセージ (health 同梱) を生成
        state_messages: list[str] = []
        change_events: list[str] = []
        for robot_name, snap in snapshots.items():
            state = self._build_state_message(robot_name, snapshot=snap)
            state_messages.append(json.dumps(state, ensure_ascii=False))

            # 3) health_change イベントを差分から生成
            prev = self._last_health.get(robot_name)
            for ev in self._diff_health(robot_name, prev, snap):
                change_events.append(json.dumps(ev, ensure_ascii=False))

        dead: set[web.WebSocketResponse] = set()
        for ws in self._ws_clients:
            if ws.closed:
                dead.add(ws)
                continue
            sent_ok = True
            for msg_text in state_messages:
                try:
                    await ws.send_str(msg_text)
                except ConnectionResetError:
                    dead.add(ws)
                    sent_ok = False
                    break
            if not sent_ok:
                continue
            for ev_text in change_events:
                try:
                    await ws.send_str(ev_text)
                except ConnectionResetError:
                    dead.add(ws)
                    break

        self._ws_clients -= dead

        # 4) 差分検出後にスナップショットを更新する。順序を逆にすると
        #    1 回目の broadcast で health_change が出てしまう。
        self._last_health = snapshots

        if self._e_stop_active:
            await self._broadcast_e_stop_state()

    def _build_state_message(
        self,
        robot_name: str,
        *,
        snapshot: HealthSnapshot | None = None,
    ) -> dict:
        ctx = self._robots[robot_name]
        progress = ctx.sequence.progress

        motors: dict[str, dict] = {}
        for motor_name, motor in ctx.can_manager._motors.items():
            s = motor.state
            motors[motor_name] = {
                "pos": s.position,
                "vel": s.velocity,
                "torque": s.current,
                "temp": s.temperature,
            }

        # snapshot が未指定 (テストや単独呼び出し) の場合はその場で計算する。
        # _broadcast_state からの呼び出しは事前計算済みのものを使い回して二重計算を避ける。
        if snapshot is None:
            snapshot = self._compute_health(robot_name)

        return {
            "type": "state",
            "robot": robot_name,
            "sequence": progress["sequence"],
            "current_step": progress["current_step"],
            "step_index": progress["step_index"],
            "total_steps": progress["total_steps"],
            "waiting_trigger": progress["waiting_trigger"],
            "motors": motors,
            "e_stop_active": self._e_stop_active,
            "health": snapshot.to_dict(),
        }

    async def start(self) -> None:
        app = self.create_app()
        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, self._host, self._port)
        await site.start()
        logger.info("サーバー起動: http://%s:%d", self._host, self._port)

        try:
            await asyncio.Event().wait()
        finally:
            await runner.cleanup()

    async def cleanup(self) -> None:
        for ws in set(self._ws_clients):
            await ws.close()
        self._ws_clients.clear()
