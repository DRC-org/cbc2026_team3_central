from __future__ import annotations

import math
import struct

import can
import pytest

from lib.drivers.base import MotorState
from lib.drivers.edulite05 import Edulite05Driver


class TestBuildCanId:
    def test_type1_motor1(self):
        # Type1, data_area2=0x0000, dest=0x01
        # (0x01 << 24) | (0x0000 << 8) | 0x01 = 0x01000001
        assert Edulite05Driver.build_can_id(0x01, 0x0000, 0x01) == 0x01000001

    def test_type3_enable(self):
        # Type3, data_area2=0x0000, dest=0x7F
        assert Edulite05Driver.build_can_id(0x03, 0x0000, 0x7F) == 0x0300007F

    def test_type1_with_torque_in_data_area2(self):
        # Type1, data_area2=0x8000 (中央=トルク0), dest=0x05
        assert Edulite05Driver.build_can_id(0x01, 0x8000, 0x05) == 0x01800005

    def test_type6_set_zero(self):
        assert Edulite05Driver.build_can_id(0x06, 0x0001, 0x0A) == 0x0600010A


class TestParseCanId:
    def test_roundtrip(self):
        arb_id = Edulite05Driver.build_can_id(0x02, 0x1234, 0x05)
        comm_type, data_area2, dest_id = Edulite05Driver.parse_can_id(arb_id)
        assert comm_type == 0x02
        assert data_area2 == 0x1234
        assert dest_id == 0x05

    def test_feedback_id(self):
        # Type2, mode_status=2(Motor), fault=0, motor_id=0x05, host_id=0x00
        # data_area2: (2 << 14) | (0 << 8) | (0x05 << 0)... 待って、仕様を再確認
        # Bit23~22: モード状態, Bit21~16: 故障コード, Bit15~8: モータID, Bit7~0: ホストID
        # しかし Bit7~0 は dest_id (= ホストID) なので data_area2 は Bit23~8
        # data_area2 = (mode_status << 14) | (fault_code << 8) | motor_id
        # mode=2, fault=0, motor_id=5 → (2<<14)|(0<<8)|5 = 0x8005
        arb_id = Edulite05Driver.build_can_id(0x02, 0x8005, 0x00)
        comm_type, data_area2, dest_id = Edulite05Driver.parse_can_id(arb_id)
        assert comm_type == 0x02
        assert data_area2 == 0x8005
        assert dest_id == 0x00


class TestFloatToUint16:
    def test_center_value(self):
        raw = Edulite05Driver.float_to_uint16(0.0, -12.0, 12.0)
        assert raw == 32767  # int(65535 / 2) = 32767

    def test_min_value(self):
        raw = Edulite05Driver.float_to_uint16(-12.0, -12.0, 12.0)
        assert raw == 0

    def test_max_value(self):
        raw = Edulite05Driver.float_to_uint16(12.0, -12.0, 12.0)
        assert raw == 65535


class TestUint16ToFloat:
    def test_center_value(self):
        val = Edulite05Driver.uint16_to_float(32768, -12.0, 12.0)
        assert val == pytest.approx(0.0, abs=0.001)

    def test_min_value(self):
        val = Edulite05Driver.uint16_to_float(0, -12.0, 12.0)
        assert val == pytest.approx(-12.0)

    def test_max_value(self):
        val = Edulite05Driver.uint16_to_float(65535, -12.0, 12.0)
        assert val == pytest.approx(12.0)


class TestEncodeMitMode:
    def test_encode_mit_zero_command(self):
        drv = Edulite05Driver("m1", can_id=0x05)
        msg = drv.encode_mit(p_des=0.0, v_des=0.0, kp=0.0, kd=0.0, torque=0.0)

        # CAN ID: Type1, data_area2=torque_raw(=32767=0x7FFF), dest=0x05
        expected_id = Edulite05Driver.build_can_id(0x01, 0x7FFF, 0x05)
        assert msg.arbitration_id == expected_id
        assert msg.is_extended_id is True

        # データ: 各パラメータの中央値 / 最小値
        p_raw = Edulite05Driver.float_to_uint16(0.0, -4 * math.pi, 4 * math.pi)
        v_raw = Edulite05Driver.float_to_uint16(0.0, -30.0, 30.0)
        kp_raw = Edulite05Driver.float_to_uint16(0.0, 0.0, 500.0)
        kd_raw = Edulite05Driver.float_to_uint16(0.0, 0.0, 5.0)
        expected_data = struct.pack(">HHHH", p_raw, v_raw, kp_raw, kd_raw)
        assert msg.data == expected_data


class TestDecodeFeedback:
    def test_decode_feedback(self):
        drv = Edulite05Driver("m1", can_id=0x05)

        pos_raw = Edulite05Driver.float_to_uint16(1.0, -4 * math.pi, 4 * math.pi)
        vel_raw = Edulite05Driver.float_to_uint16(2.0, -30.0, 30.0)
        torque_raw = Edulite05Driver.float_to_uint16(0.5, -12.0, 12.0)
        temp_raw = 250  # 25.0℃

        data = struct.pack(">HHH", pos_raw, vel_raw, torque_raw) + struct.pack(">H", temp_raw)
        # data_area2: mode=2(Motor), fault=0, motor_id=0x05
        data_area2 = (2 << 14) | (0 << 8) | 0x05
        arb_id = Edulite05Driver.build_can_id(0x02, data_area2, 0x00)
        msg = can.Message(arbitration_id=arb_id, data=data, is_extended_id=True)

        state = drv.decode_feedback(msg)
        assert isinstance(state, MotorState)
        assert state.position == pytest.approx(1.0, abs=0.01)
        assert state.velocity == pytest.approx(2.0, abs=0.01)
        assert state.current == pytest.approx(0.5, abs=0.01)
        assert state.temperature == pytest.approx(25.0)


class TestEncodeEnable:
    def test_encode_enable(self):
        drv = Edulite05Driver("m1", can_id=0x05)
        msg = drv.encode_enable()

        expected_id = Edulite05Driver.build_can_id(0x03, 0x0000, 0x05)
        assert msg.arbitration_id == expected_id
        assert msg.is_extended_id is True
        assert msg.data == bytes(8)


class TestEncodeDisable:
    def test_encode_disable(self):
        drv = Edulite05Driver("m1", can_id=0x05)
        msg = drv.encode_disable()

        expected_id = Edulite05Driver.build_can_id(0x04, 0x0000, 0x05)
        assert msg.arbitration_id == expected_id
        assert msg.is_extended_id is True
        assert msg.data == bytes(8)


class TestMatchesFeedback:
    def test_matches_own_feedback(self):
        drv = Edulite05Driver("m1", can_id=0x05)
        # Type2 フィードバック, motor_id=0x05
        data_area2 = (2 << 14) | (0 << 8) | 0x05
        arb_id = Edulite05Driver.build_can_id(0x02, data_area2, 0x00)
        msg = can.Message(arbitration_id=arb_id, data=bytes(8), is_extended_id=True)
        assert drv.matches_feedback(msg) is True

    def test_matches_feedback_wrong_motor(self):
        drv = Edulite05Driver("m1", can_id=0x05)
        # Type2 フィードバック, motor_id=0x0A (別モータ)
        data_area2 = (2 << 14) | (0 << 8) | 0x0A
        arb_id = Edulite05Driver.build_can_id(0x02, data_area2, 0x00)
        msg = can.Message(arbitration_id=arb_id, data=bytes(8), is_extended_id=True)
        assert drv.matches_feedback(msg) is False

    def test_matches_feedback_wrong_type(self):
        drv = Edulite05Driver("m1", can_id=0x05)
        # Type1 (制御送信) は フィードバックではない
        arb_id = Edulite05Driver.build_can_id(0x01, 0x0000, 0x05)
        msg = can.Message(arbitration_id=arb_id, data=bytes(8), is_extended_id=True)
        assert drv.matches_feedback(msg) is False
