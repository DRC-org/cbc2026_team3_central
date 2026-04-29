from __future__ import annotations

import struct

import can

from lib.drivers.base import ControlMode, MotorDriver, MotorState

_CURRENT_MIN = -16384
_CURRENT_MAX = 16384
_TX_ARBITRATION_ID = 0x200
_FEEDBACK_BASE_ID = 0x200
_ANGLE_MAX = 8191

# C620 ESC は明示的な過電流フラグを持たないため、フィードバック電流の絶対値で異常検出する
# しきい値 18000 は連続定格 (約 ±10000 mA) を大きく超え、かつ素子飽和 (16384) より上の値を選定
# 後続フェーズで config 化するが段階② では定数で実装する
_OVERCURRENT_THRESHOLD_MA = 18000


def _clamp(value: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, value))


class M3508Driver(MotorDriver):
    """DJI M3508 モータドライバ (C620 ESC 経由 CAN 通信)。"""

    def __init__(self, name: str, can_id: int) -> None:
        if not 1 <= can_id <= 4:
            raise ValueError(f"can_id は 1〜4 の範囲: {can_id}")
        super().__init__(name, can_id)

    def encode_target(self, mode: ControlMode, value: float) -> can.Message:
        if mode is not ControlMode.CURRENT:
            raise ValueError(f"M3508 は CURRENT モードのみサポート (受け取った: {mode.name})")

        clamped = _clamp(int(value), _CURRENT_MIN, _CURRENT_MAX)
        currents = [0, 0, 0, 0]
        currents[self.can_id - 1] = clamped

        return can.Message(
            arbitration_id=_TX_ARBITRATION_ID,
            data=struct.pack(">hhhh", *currents),
            is_extended_id=False,
        )

    def decode_feedback(self, msg: can.Message) -> MotorState:
        angle_raw, rpm, current, temp = struct.unpack(">hhhB", msg.data[:7])
        position_deg = (angle_raw & 0xFFFF) / _ANGLE_MAX * 360.0

        return MotorState(
            position=position_deg,
            velocity=float(rpm),
            current=float(current),
            temperature=float(temp),
        )

    def matches_feedback(self, msg: can.Message) -> bool:
        return msg.arbitration_id == _FEEDBACK_BASE_ID + self.can_id

    def has_overcurrent_warning(self) -> bool:
        return abs(self._state.current) > _OVERCURRENT_THRESHOLD_MA

    @staticmethod
    def encode_current_frame(currents: list[int]) -> can.Message:
        """4モータ分の電流指令を1つの CAN フレームにまとめる。"""
        clamped = [_clamp(c, _CURRENT_MIN, _CURRENT_MAX) for c in currents]
        return can.Message(
            arbitration_id=_TX_ARBITRATION_ID,
            data=struct.pack(">hhhh", *clamped),
            is_extended_id=False,
        )
