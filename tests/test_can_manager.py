from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import can
import pytest

from lib.can_manager import CANManager
from lib.drivers.base import MotorState


def _make_mock_bus() -> MagicMock:
    bus = MagicMock()
    bus.recv.return_value = None
    return bus


def _make_mock_motor(name: str, can_id: int) -> MagicMock:
    motor = MagicMock()
    motor.name = name
    motor.can_id = can_id
    motor.matches_feedback.return_value = False
    motor.update_state.return_value = MotorState()
    return motor


class TestCANManager:
    def test_add_bus_and_motor(self) -> None:
        mgr = CANManager()
        bus = _make_mock_bus()
        motor = _make_mock_motor("m1", 1)

        mgr.add_bus("can0", bus)
        mgr.add_motor("can0", motor)

        assert mgr.get_motor("m1") is motor

    def test_get_motor(self) -> None:
        mgr = CANManager()
        bus = _make_mock_bus()
        motor = _make_mock_motor("drive", 2)

        mgr.add_bus("can0", bus)
        mgr.add_motor("can0", motor)

        assert mgr.get_motor("drive") is motor

    def test_get_motor_not_found(self) -> None:
        mgr = CANManager()
        with pytest.raises(KeyError):
            mgr.get_motor("nonexistent")

    async def test_send_to_correct_bus(self) -> None:
        mgr = CANManager()
        bus0 = _make_mock_bus()
        bus1 = _make_mock_bus()
        motor = _make_mock_motor("m1", 1)

        mgr.add_bus("can0", bus0)
        mgr.add_bus("can1", bus1)
        mgr.add_motor("can0", motor)

        msg = can.Message(arbitration_id=0x200, data=bytes(8))

        with patch("asyncio.get_event_loop") as mock_loop:
            mock_loop.return_value.run_in_executor = AsyncMock()
            await mgr.send("m1", msg)
            mock_loop.return_value.run_in_executor.assert_called_once_with(
                None, bus0.send, msg
            )

    async def test_receive_updates_motor_state(self) -> None:
        mgr = CANManager()
        bus = _make_mock_bus()
        motor = _make_mock_motor("m1", 1)
        motor.matches_feedback.return_value = True

        feedback_state = MotorState(position=90.0, velocity=100.0)
        motor.update_state.return_value = feedback_state

        mgr.add_bus("can0", bus)
        mgr.add_motor("can0", motor)

        feedback_msg = can.Message(arbitration_id=0x201, data=bytes(8))

        call_count = 0

        def recv_side_effect(timeout: float) -> can.Message | None:
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return feedback_msg
            raise asyncio.CancelledError

        bus.recv.side_effect = recv_side_effect

        with patch("asyncio.get_event_loop") as mock_loop:
            async def fake_executor(executor, fn, *args):
                return fn(*args)

            mock_loop.return_value.run_in_executor = AsyncMock(side_effect=fake_executor)

            with pytest.raises(asyncio.CancelledError):
                await mgr._receive_loop("can0")

        motor.matches_feedback.assert_called_once_with(feedback_msg)
        motor.update_state.assert_called_once_with(feedback_msg)

    async def test_state_update_callback(self) -> None:
        mgr = CANManager()
        bus = _make_mock_bus()
        motor = _make_mock_motor("m1", 1)
        motor.matches_feedback.return_value = True

        feedback_state = MotorState(position=45.0)
        motor.update_state.return_value = feedback_state

        callback = MagicMock()
        mgr.set_on_state_update(callback)

        mgr.add_bus("can0", bus)
        mgr.add_motor("can0", motor)

        feedback_msg = can.Message(arbitration_id=0x201, data=bytes(8))
        call_count = 0

        def recv_side_effect(timeout: float) -> can.Message | None:
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return feedback_msg
            raise asyncio.CancelledError

        bus.recv.side_effect = recv_side_effect

        with patch("asyncio.get_event_loop") as mock_loop:
            async def fake_executor(executor, fn, *args):
                return fn(*args)

            mock_loop.return_value.run_in_executor = AsyncMock(side_effect=fake_executor)

            with pytest.raises(asyncio.CancelledError):
                await mgr._receive_loop("can0")

        callback.assert_called_once_with("m1", feedback_state)

    async def test_shutdown(self) -> None:
        mgr = CANManager()
        bus0 = _make_mock_bus()
        bus1 = _make_mock_bus()

        mgr.add_bus("can0", bus0)
        mgr.add_bus("can1", bus1)

        await mgr.shutdown()

        bus0.shutdown.assert_called_once()
        bus1.shutdown.assert_called_once()
