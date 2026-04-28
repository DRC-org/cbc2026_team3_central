from __future__ import annotations

import asyncio
import contextlib
import logging
from collections.abc import Callable
from typing import TYPE_CHECKING

import can

from lib.drivers.base import MotorDriver

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

    def add_bus(self, name: str, bus: can.Bus) -> None:
        self._buses[name] = bus
        self._bus_motors.setdefault(name, [])

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
        await loop.run_in_executor(None, bus.send, msg)

    async def _receive_loop(self, bus_name: str) -> None:
        bus = self._buses[bus_name]
        motors = self._bus_motors[bus_name]
        loop = asyncio.get_event_loop()

        while True:
            msg: can.Message | None = await loop.run_in_executor(
                None, bus.recv, _RECV_TIMEOUT
            )
            if msg is None:
                continue

            for motor in motors:
                if motor.matches_feedback(msg):
                    state = motor.update_state(msg)
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
