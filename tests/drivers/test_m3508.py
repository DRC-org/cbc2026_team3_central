from __future__ import annotations

import struct

import can
import pytest

from lib.drivers.base import ControlMode, MotorState
from lib.drivers.m3508 import M3508Driver


class TestEncodeCurrentCommand:
    def setup_method(self) -> None:
        self.driver = M3508Driver("test_motor", can_id=1)

    def test_encode_current_command(self) -> None:
        msg = self.driver.encode_target(ControlMode.CURRENT, 5000)
        assert msg.arbitration_id == 0x200
        assert msg.is_extended_id is False
        values = struct.unpack(">hhhh", msg.data)
        assert values[0] == 5000
        assert values[1] == 0
        assert values[2] == 0
        assert values[3] == 0

    def test_encode_current_command_negative(self) -> None:
        msg = self.driver.encode_target(ControlMode.CURRENT, -10000)
        values = struct.unpack(">hhhh", msg.data)
        assert values[0] == -10000

    def test_encode_current_command_clamp(self) -> None:
        msg_over = self.driver.encode_target(ControlMode.CURRENT, 20000)
        values_over = struct.unpack(">hhhh", msg_over.data)
        assert values_over[0] == 16384

        msg_under = self.driver.encode_target(ControlMode.CURRENT, -20000)
        values_under = struct.unpack(">hhhh", msg_under.data)
        assert values_under[0] == -16384


class TestEncodeCurrentCommandMotor3:
    """モータ ID 3 の場合、バイト 4-5 にスロットされることを確認。"""

    def test_encode_motor3_slot(self) -> None:
        driver = M3508Driver("motor3", can_id=3)
        msg = driver.encode_target(ControlMode.CURRENT, 1000)
        values = struct.unpack(">hhhh", msg.data)
        assert values[0] == 0
        assert values[1] == 0
        assert values[2] == 1000
        assert values[3] == 0


class TestEncodeCurrentCommandInvalidMode:
    def test_velocity_mode_raises(self) -> None:
        driver = M3508Driver("test", can_id=1)
        with pytest.raises(ValueError, match="CURRENT"):
            driver.encode_target(ControlMode.VELOCITY, 100)


class TestDecodeFeedback:
    def setup_method(self) -> None:
        self.driver = M3508Driver("test_motor", can_id=1)

    def test_decode_feedback(self) -> None:
        angle_raw = 4096
        rpm_raw = 1000
        current_raw = 500
        temp_raw = 40
        data = struct.pack(">hhhBB", angle_raw, rpm_raw, current_raw, temp_raw, 0)
        msg = can.Message(arbitration_id=0x201, data=data, is_extended_id=False)

        state = self.driver.decode_feedback(msg)
        assert isinstance(state, MotorState)
        assert state.position == pytest.approx(4096 / 8191 * 360, abs=0.1)
        assert state.velocity == pytest.approx(1000.0)
        assert state.current == pytest.approx(500.0)
        assert state.temperature == pytest.approx(40.0)

    def test_decode_feedback_negative_rpm(self) -> None:
        data = struct.pack(">hhhBB", 0, -3000, -200, 25, 0)
        msg = can.Message(arbitration_id=0x201, data=data, is_extended_id=False)

        state = self.driver.decode_feedback(msg)
        assert state.velocity == pytest.approx(-3000.0)
        assert state.current == pytest.approx(-200.0)


class TestMatchesFeedback:
    def test_matches_feedback(self) -> None:
        driver = M3508Driver("test", can_id=2)
        msg = can.Message(arbitration_id=0x202, data=bytes(8), is_extended_id=False)
        assert driver.matches_feedback(msg) is True

    def test_matches_feedback_wrong_id(self) -> None:
        driver = M3508Driver("test", can_id=2)
        msg = can.Message(arbitration_id=0x201, data=bytes(8), is_extended_id=False)
        assert driver.matches_feedback(msg) is False

        msg_unrelated = can.Message(arbitration_id=0x100, data=bytes(8), is_extended_id=False)
        assert driver.matches_feedback(msg_unrelated) is False


class TestEncodeCurrentFrame:
    def test_encode_current_frame(self) -> None:
        msg = M3508Driver.encode_current_frame([1000, -2000, 3000, -4000])
        assert msg.arbitration_id == 0x200
        assert msg.is_extended_id is False
        values = struct.unpack(">hhhh", msg.data)
        assert values == (1000, -2000, 3000, -4000)

    def test_encode_current_frame_clamp(self) -> None:
        msg = M3508Driver.encode_current_frame([20000, -20000, 0, 0])
        values = struct.unpack(">hhhh", msg.data)
        assert values[0] == 16384
        assert values[1] == -16384
