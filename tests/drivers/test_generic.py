from __future__ import annotations

import struct

import can
import pytest

from lib.drivers.base import ControlMode
from lib.drivers.generic import CommandType, GenericDriver


class TestBuildCanId:
    def test_build_can_id(self):
        assert GenericDriver.build_can_id(CommandType.SET_TARGET, 0x01) == 0x001
        assert GenericDriver.build_can_id(CommandType.FEEDBACK, 0x01) == 0x101
        assert GenericDriver.build_can_id(CommandType.SET_MODE, 0x10) == 0x210
        assert GenericDriver.build_can_id(CommandType.E_STOP, 0xFF) == 0x7FF


class TestParseCanId:
    def test_parse_can_id(self):
        cmd, dev = GenericDriver.parse_can_id(0x001)
        assert cmd == CommandType.SET_TARGET
        assert dev == 0x01

        cmd, dev = GenericDriver.parse_can_id(0x101)
        assert cmd == CommandType.FEEDBACK
        assert dev == 0x01

        cmd, dev = GenericDriver.parse_can_id(0x7FF)
        assert cmd == CommandType.E_STOP
        assert dev == 0xFF


class TestEncodeTarget:
    def setup_method(self):
        self.drv = GenericDriver("test_motor", 0x01)

    def test_encode_target_position(self):
        msg = self.drv.encode_target(ControlMode.POSITION, 90.0)
        assert msg.arbitration_id == 0x001
        assert msg.is_extended_id is False
        assert msg.data[0] == 0  # position
        assert msg.data[1] == 0x00
        value = struct.unpack_from("<f", msg.data, 2)[0]
        assert value == pytest.approx(90.0)
        assert msg.data[6] == 0x00
        assert msg.data[7] == 0x00

    def test_encode_target_velocity(self):
        msg = self.drv.encode_target(ControlMode.VELOCITY, -100.5)
        assert msg.arbitration_id == 0x001
        assert msg.data[0] == 1  # velocity
        value = struct.unpack_from("<f", msg.data, 2)[0]
        assert value == pytest.approx(-100.5)

    def test_encode_target_duty(self):
        msg = self.drv.encode_target(ControlMode.DUTY, 0.75)
        assert msg.arbitration_id == 0x001
        assert msg.data[0] == 2  # duty
        value = struct.unpack_from("<f", msg.data, 2)[0]
        assert value == pytest.approx(0.75)


class TestDecodeFeedback:
    def setup_method(self):
        self.drv = GenericDriver("test_motor", 0x01)

    def test_decode_feedback(self):
        data = bytearray(8)
        struct.pack_into("<h", data, 0, 1800)  # 180.0 deg
        struct.pack_into("<h", data, 2, 300)  # 300 rpm
        struct.pack_into("<h", data, 4, 1500)  # 1500 mA
        data[6] = 45  # 45℃
        data[7] = 0x00

        msg = can.Message(arbitration_id=0x101, data=bytes(data), is_extended_id=False)
        state = self.drv.decode_feedback(msg)

        assert state.position == pytest.approx(180.0)
        assert state.velocity == pytest.approx(300.0)
        assert state.current == pytest.approx(1500.0)
        assert state.temperature == pytest.approx(45.0)
        assert state.reached is False

    def test_decode_feedback_with_flags(self):
        data = bytearray(8)
        struct.pack_into("<h", data, 0, 0)
        struct.pack_into("<h", data, 2, 0)
        struct.pack_into("<h", data, 4, 0)
        data[6] = 80
        data[7] = 0b00000001  # reached=True

        msg = can.Message(arbitration_id=0x101, data=bytes(data), is_extended_id=False)
        state = self.drv.decode_feedback(msg)
        assert state.reached is True

        data[7] = 0b00000101  # reached=True, overheat=True
        msg = can.Message(arbitration_id=0x101, data=bytes(data), is_extended_id=False)
        state = self.drv.decode_feedback(msg)
        assert state.reached is True


class TestMatchesFeedback:
    def setup_method(self):
        self.drv = GenericDriver("test_motor", 0x01)

    def test_matches_feedback(self):
        msg = can.Message(arbitration_id=0x101, data=bytes(8), is_extended_id=False)
        assert self.drv.matches_feedback(msg) is True

    def test_matches_feedback_wrong_device(self):
        msg = can.Message(arbitration_id=0x102, data=bytes(8), is_extended_id=False)
        assert self.drv.matches_feedback(msg) is False

        msg_target = can.Message(arbitration_id=0x001, data=bytes(8), is_extended_id=False)
        assert self.drv.matches_feedback(msg_target) is False


class TestEncodeEStop:
    def test_encode_e_stop(self):
        msg = GenericDriver.encode_e_stop()
        assert msg.arbitration_id == 0x7FF
        assert msg.is_extended_id is False
        assert msg.data == bytes(8)


class TestEncodeSetMode:
    def setup_method(self):
        self.drv = GenericDriver("test_motor", 0x01)

    def test_encode_set_mode(self):
        msg = self.drv.encode_set_mode(ControlMode.POSITION)
        assert msg.arbitration_id == GenericDriver.build_can_id(CommandType.SET_MODE, 0x01)
        assert msg.data[0] == 0
        assert msg.data[1:] == bytes(7)

        msg = self.drv.encode_set_mode(ControlMode.VELOCITY)
        assert msg.data[0] == 1

        msg = self.drv.encode_set_mode(ControlMode.DUTY)
        assert msg.data[0] == 2
