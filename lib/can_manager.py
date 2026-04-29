from __future__ import annotations

import asyncio
import contextlib
import logging
import time
from collections.abc import Callable
from typing import TYPE_CHECKING

import can

from lib.drivers.base import MotorDriver
from lib.health import (
    BusHealth,
    BusHealthInfo,
    HealthSnapshot,
    MotorHealth,
    MotorHealthInfo,
)

if TYPE_CHECKING:
    from lib.drivers.base import MotorState

logger = logging.getLogger(__name__)

_RECV_TIMEOUT = 0.01


class CANManager:
    """複数の CAN バスとモータドライバを asyncio で管理する。"""

    def __init__(self) -> None:
        self._buses: dict[str, can.Bus] = {}
        self._motors: dict[str, MotorDriver] = {}
        self._motor_bus: dict[str, str] = {}
        self._bus_motors: dict[str, list[MotorDriver]] = {}
        self._on_state_update: Callable[[str, MotorState], None] | None = None
        self._tasks: list[asyncio.Task[None]] = []

        # ヘルスチェック (Phase 6) 用の受動監視タイムスタンプとカウンタ。
        # 受信ループは _last_rx_at のみ更新し、送信失敗は send_to_bus 内で
        # _tx_error_count を増やす。
        self._last_rx_at: dict[str, float] = {}
        self._last_tx_at: dict[str, float] = {}
        self._tx_error_count: dict[str, int] = {}
        self._rx_error_count: dict[str, int] = {}
        self._bus_off: dict[str, bool] = {}
        self._bus_channels: dict[str, str] = {}

    def add_bus(self, name: str, bus: can.Bus, channel: str = "") -> None:
        self._buses[name] = bus
        self._bus_motors.setdefault(name, [])

        # channel 文字列はヘルススナップショットの BusHealthInfo.channel に載せる。
        # 呼び出し側が省略した場合は python-can の channel_info から推測 (失敗時は空文字)。
        if not channel:
            channel = getattr(bus, "channel_info", "") or ""
        self._bus_channels[name] = channel

        self._tx_error_count.setdefault(name, 0)
        self._rx_error_count.setdefault(name, 0)
        self._bus_off.setdefault(name, False)

    def add_motor(self, bus_name: str, motor: MotorDriver) -> None:
        if bus_name not in self._buses:
            raise KeyError(f"バス '{bus_name}' が登録されていません")
        self._motors[motor.name] = motor
        self._motor_bus[motor.name] = bus_name
        self._bus_motors[bus_name].append(motor)

    def get_motor(self, name: str) -> MotorDriver:
        return self._motors[name]

    def set_on_state_update(self, callback: Callable[[str, MotorState], None]) -> None:
        self._on_state_update = callback

    async def send(self, motor_name: str, msg: can.Message) -> None:
        bus_name = self._motor_bus[motor_name]
        await self.send_to_bus(bus_name, msg)

    async def send_to_bus(self, bus_name: str, msg: can.Message) -> None:
        bus = self._buses[bus_name]
        loop = asyncio.get_event_loop()
        try:
            await loop.run_in_executor(None, bus.send, msg)
        except can.CanError:
            # CAN プロトコル層の送信失敗。tx_error_count を増やしつつ、
            # 既存呼び出し元 (server.py の e_stop など) との互換性のため例外を再 raise する。
            self._tx_error_count[bus_name] = self._tx_error_count.get(bus_name, 0) + 1
            raise
        except Exception:
            # OS / executor / その他の異常も健全性カウンタに反映してから上位へ伝搬。
            self._tx_error_count[bus_name] = self._tx_error_count.get(bus_name, 0) + 1
            raise
        else:
            self._last_tx_at[bus_name] = time.time()

    async def _receive_loop(self, bus_name: str) -> None:
        bus = self._buses[bus_name]
        motors = self._bus_motors[bus_name]
        loop = asyncio.get_event_loop()

        while True:
            msg: can.Message | None = await loop.run_in_executor(None, bus.recv, _RECV_TIMEOUT)
            if msg is None:
                continue

            for motor in motors:
                if motor.matches_feedback(msg):
                    state = motor.update_state(msg)
                    # フィードバック鮮度を MotorHealth の STALE 判定に使う。
                    self._last_rx_at[motor.name] = time.time()
                    if self._on_state_update is not None:
                        self._on_state_update(motor.name, state)
                    break

    async def run(self) -> None:
        for bus_name in self._buses:
            task = asyncio.create_task(self._receive_loop(bus_name))
            self._tasks.append(task)

    async def shutdown(self) -> None:
        for task in self._tasks:
            task.cancel()
        for task in self._tasks:
            with contextlib.suppress(asyncio.CancelledError):
                await task
        self._tasks.clear()

        for bus in self._buses.values():
            bus.shutdown()

    # ------------------------------------------------------------------ #
    #  ヘルスチェック (Phase 6, タスク 6-8)
    # ------------------------------------------------------------------ #

    def health(
        self,
        *,
        feedback_timeout_ms: float = 500.0,
        temp_warning_c: float = 65.0,
        temp_critical_c: float = 80.0,
        tx_error_threshold: int = 96,
    ) -> HealthSnapshot:
        """現在の受動監視状態から HealthSnapshot を組み立てる (同期処理)。

        サーバの WS 配信ループや GET /health から呼ばれる前提で副作用を持たない。
        能動 ping は段階⑥ の MotorCheckRunner が担うため本メソッドでは行わない。
        """
        now = time.time()

        buses: list[BusHealthInfo] = []
        motors: list[MotorHealthInfo] = []

        # モータ情報 (バス情報の last_rx_at 集計に必要なので先に確定させる)
        bus_latest_rx: dict[str, float] = {}
        for motor_name, motor in self._motors.items():
            bus_name = self._motor_bus[motor_name]
            last_fb = self._last_rx_at.get(motor_name)
            age_ms = (now - last_fb) * 1000.0 if last_fb is not None else None

            # 優先度: ハード fault > 温度 critical > フィードバック切れ > warning > OK。
            # FAULT 系は STALE/WARNING より重大なので先に判定する。
            stale = last_fb is None or (age_ms is not None and age_ms > feedback_timeout_ms)
            warning = (
                motor.has_thermal_warning(temp_warning_c, temp_critical_c)
                or motor.has_overcurrent_warning()
            )

            if motor.is_fault() or motor.has_thermal_fault(temp_critical_c):
                state = MotorHealth.FAULT
            elif stale:
                state = MotorHealth.STALE
            elif warning:
                state = MotorHealth.WARNING
            else:
                state = MotorHealth.OK

            motors.append(
                MotorHealthInfo(
                    name=motor_name,
                    bus=bus_name,
                    state=state,
                    last_feedback_at=last_fb,
                    feedback_age_ms=age_ms,
                    temperature=motor.state.temperature,
                    detail=None,
                )
            )

            # バス側の last_rx_at にはバス上のいずれかのモータの最新受信時刻を採用
            if last_fb is not None:
                prev = bus_latest_rx.get(bus_name)
                if prev is None or last_fb > prev:
                    bus_latest_rx[bus_name] = last_fb

        # バス情報
        for bus_name, bus in self._buses.items():
            tx_err = self._tx_error_count.get(bus_name, 0)
            rx_err = self._rx_error_count.get(bus_name, 0)
            bus_off = self._bus_off.get(bus_name, False)

            # python-can の bus.state は virtual バスでは未提供のため getattr で防御的に読む。
            # ACTIVE 以外で ERROR/PASSIVE のときだけ降格判定に使う。
            can_state = getattr(bus, "state", None)
            error_state = getattr(can.BusState, "ERROR", None)
            passive_state = getattr(can.BusState, "PASSIVE", None)
            is_error = can_state is not None and can_state == error_state
            is_passive = can_state is not None and can_state == passive_state

            if bus_off or is_error:
                state = BusHealth.DOWN
            elif tx_err >= tx_error_threshold or is_passive:
                state = BusHealth.DEGRADED
            else:
                state = BusHealth.OK

            buses.append(
                BusHealthInfo(
                    name=bus_name,
                    channel=self._bus_channels.get(bus_name, ""),
                    state=state,
                    last_tx_at=self._last_tx_at.get(bus_name),
                    last_rx_at=bus_latest_rx.get(bus_name),
                    tx_error_count=tx_err,
                    rx_error_count=rx_err,
                    bus_off=bus_off,
                )
            )

        overall = HealthSnapshot.compute_overall(buses, motors)
        return HealthSnapshot(timestamp=now, overall=overall, buses=buses, motors=motors)
