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


class TestHealth:
    """ヘルスチェック判定 (Phase 6 段階②)。"""

    def setup_method(self) -> None:
        self.driver = M3508Driver("test_motor", can_id=1)

    def _feed(self, *, current: int = 0, temp: int = 25) -> None:
        # フィードバックフレームを 1 つ流して内部 state を更新する補助
        data = struct.pack(">hhhBB", 0, 0, current, temp, 0)
        msg = can.Message(arbitration_id=0x201, data=data, is_extended_id=False)
        self.driver.update_state(msg)

    def test_thermal_warning_below_threshold(self) -> None:
        self._feed(temp=60)
        assert self.driver.has_thermal_warning(temp_warning_c=65, temp_critical_c=80) is False

    def test_thermal_warning_at_threshold(self) -> None:
        self._feed(temp=65)
        assert self.driver.has_thermal_warning(temp_warning_c=65, temp_critical_c=80) is True

    def test_thermal_fault_at_critical(self) -> None:
        self._feed(temp=80)
        assert self.driver.has_thermal_fault(temp_critical_c=80) is True
        # critical 未満なら fault ではない
        self._feed(temp=79)
        assert self.driver.has_thermal_fault(temp_critical_c=80) is False

    def test_overcurrent_warning_above_threshold(self) -> None:
        # しきい値 18000 mA を超える電流で警告
        self._feed(current=18500)
        assert self.driver.has_overcurrent_warning() is True

    def test_overcurrent_warning_negative_above_threshold(self) -> None:
        # 逆方向の電流暴走も検出 (絶対値判定)
        self._feed(current=-19000)
        assert self.driver.has_overcurrent_warning() is True

    def test_overcurrent_warning_within_limit(self) -> None:
        self._feed(current=15000)
        assert self.driver.has_overcurrent_warning() is False

    def test_is_fault_default_false(self) -> None:
        # M3508 には明示的な fault フラグがないので常に False
        self._feed(temp=200, current=20000)
        assert self.driver.is_fault() is False


class TestMotorCheck:
    """アクチュエータ動作確認 API (Phase 6 段階⑦)。"""

    def setup_method(self) -> None:
        self.driver = M3508Driver("test_motor", can_id=1)

    def _feed(self, *, velocity: int, current: int = 0, temp: int = 25) -> None:
        # M3508 フィードバックの velocity 符号は電流符号と一致する想定
        data = struct.pack(">hhhBB", 0, velocity, current, temp, 0)
        msg = can.Message(arbitration_id=0x201, data=data, is_extended_id=False)
        self.driver.update_state(msg)

    def test_check_command_uses_specified_magnitude(self) -> None:
        msg, context = self.driver.check_command(magnitude=500.0)
        assert msg.arbitration_id == 0x200
        assert msg.is_extended_id is False
        values = struct.unpack(">hhhh", msg.data)
        # can_id=1 → スロット 0 に 500 mA 投入
        assert values[0] == 500
        assert values[1] == 0
        assert context["target"] == pytest.approx(500.0)
        assert context["mode"] == "current"

    def test_check_command_negative_magnitude(self) -> None:
        msg, context = self.driver.check_command(magnitude=-500.0)
        values = struct.unpack(">hhhh", msg.data)
        assert values[0] == -500
        assert context["target"] == pytest.approx(-500.0)

    def test_evaluate_passed_when_velocity_sign_matches(self) -> None:
        _, context = self.driver.check_command(magnitude=500.0)
        # 電流指令と同符号の rpm がフィードバック → PASSED
        self._feed(velocity=300)
        passed, detail = self.driver.evaluate_check_result(self.driver.state, context)
        assert passed is True
        assert detail is None

    def test_evaluate_failed_when_velocity_sign_mismatch(self) -> None:
        _, context = self.driver.check_command(magnitude=500.0)
        # 電流指令は正だが rpm が逆方向 → FAILED
        self._feed(velocity=-300)
        passed, detail = self.driver.evaluate_check_result(self.driver.state, context)
        assert passed is False
        assert detail is not None

    def test_evaluate_failed_when_velocity_near_zero(self) -> None:
        _, context = self.driver.check_command(magnitude=500.0)
        # |rpm| < 50 は「回転検出なし」
        self._feed(velocity=10)
        passed, detail = self.driver.evaluate_check_result(self.driver.state, context)
        assert passed is False
        assert detail is not None
        assert "回転" in detail

    def test_reset_after_check_sends_zero_current(self) -> None:
        msg = self.driver.reset_after_check()
        values = struct.unpack(">hhhh", msg.data)
        assert values[0] == 0
        assert values[1] == 0
        assert values[2] == 0
        assert values[3] == 0
