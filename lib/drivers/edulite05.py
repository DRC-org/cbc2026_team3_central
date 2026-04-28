from __future__ import annotations

import math
import struct

import can

from lib.drivers.base import ControlMode, MotorDriver, MotorState


class Edulite05Driver(MotorDriver):
    """RobStride EDULITE 05 モータドライバ (CAN 2.0B Extended Frame)"""

    POS_MIN, POS_MAX = -4 * math.pi, 4 * math.pi
    VEL_MIN, VEL_MAX = -30.0, 30.0
    TORQUE_MIN, TORQUE_MAX = -12.0, 12.0
    KP_MIN, KP_MAX = 0.0, 500.0
    KD_MIN, KD_MAX = 0.0, 5.0

    COMM_TYPE_MIT = 0x01
    COMM_TYPE_FEEDBACK = 0x02
    COMM_TYPE_ENABLE = 0x03
    COMM_TYPE_DISABLE = 0x04
    COMM_TYPE_SET_ZERO = 0x06

    def __init__(self, name: str, can_id: int, host_id: int = 0x00) -> None:
        super().__init__(name, can_id)
        self.host_id = host_id

    # ------------------------------------------------------------------ #
    #  静的ユーティリティ
    # ------------------------------------------------------------------ #

    @staticmethod
    def build_can_id(comm_type: int, data_area2: int, dest_id: int) -> int:
        """29bit CAN ID を組み立てる。"""
        return (comm_type << 24) | (data_area2 << 8) | dest_id

    @staticmethod
    def parse_can_id(arbitration_id: int) -> tuple[int, int, int]:
        """29bit CAN ID を (comm_type, data_area2, dest_id) にパースする。"""
        comm_type = (arbitration_id >> 24) & 0x1F
        data_area2 = (arbitration_id >> 8) & 0xFFFF
        dest_id = arbitration_id & 0xFF
        return comm_type, data_area2, dest_id

    @staticmethod
    def float_to_uint16(value: float, min_val: float, max_val: float) -> int:
        """float を uint16 にマッピング変換する。"""
        return int((value - min_val) / (max_val - min_val) * 65535.0)

    @staticmethod
    def uint16_to_float(raw: int, min_val: float, max_val: float) -> float:
        """uint16 を float に逆マッピング変換する。"""
        return (raw / 65535.0) * (max_val - min_val) + min_val

    # ------------------------------------------------------------------ #
    #  コマンドエンコード
    # ------------------------------------------------------------------ #

    def encode_mit(
        self,
        p_des: float,
        v_des: float,
        kp: float,
        kd: float,
        torque: float,
    ) -> can.Message:
        """MIT モード制御フレームを生成する。"""
        torque_raw = self.float_to_uint16(torque, self.TORQUE_MIN, self.TORQUE_MAX)
        arb_id = self.build_can_id(self.COMM_TYPE_MIT, torque_raw, self.can_id)

        p_raw = self.float_to_uint16(p_des, self.POS_MIN, self.POS_MAX)
        v_raw = self.float_to_uint16(v_des, self.VEL_MIN, self.VEL_MAX)
        kp_raw = self.float_to_uint16(kp, self.KP_MIN, self.KP_MAX)
        kd_raw = self.float_to_uint16(kd, self.KD_MIN, self.KD_MAX)

        data = struct.pack(">HHHH", p_raw, v_raw, kp_raw, kd_raw)
        return can.Message(arbitration_id=arb_id, data=data, is_extended_id=True)

    def encode_target(self, mode: ControlMode, value: float) -> can.Message:
        """CURRENT モードのみサポート。MIT モードで torque として送信する。"""
        if mode is not ControlMode.CURRENT:
            raise ValueError(f"Edulite05Driver は {mode} モードをサポートしていません")
        return self.encode_mit(p_des=0.0, v_des=0.0, kp=0.0, kd=0.0, torque=value)

    def encode_enable(self) -> can.Message:
        """モータ有効化コマンドを生成する。"""
        arb_id = self.build_can_id(self.COMM_TYPE_ENABLE, 0x0000, self.can_id)
        return can.Message(arbitration_id=arb_id, data=bytes(8), is_extended_id=True)

    def encode_disable(self) -> can.Message:
        """モータ停止コマンドを生成する。"""
        arb_id = self.build_can_id(self.COMM_TYPE_DISABLE, 0x0000, self.can_id)
        return can.Message(arbitration_id=arb_id, data=bytes(8), is_extended_id=True)

    def encode_set_zero(self) -> can.Message:
        """ゼロ点設定コマンドを生成する。"""
        arb_id = self.build_can_id(self.COMM_TYPE_SET_ZERO, 0x0001, self.can_id)
        return can.Message(arbitration_id=arb_id, data=bytes(8), is_extended_id=True)

    # ------------------------------------------------------------------ #
    #  フィードバック
    # ------------------------------------------------------------------ #

    def decode_feedback(self, msg: can.Message) -> MotorState:
        """フィードバックフレームをデコードして MotorState を返す。"""
        pos_raw, vel_raw, torque_raw, temp_raw = struct.unpack(">HHHH", msg.data)

        return MotorState(
            position=self.uint16_to_float(pos_raw, self.POS_MIN, self.POS_MAX),
            velocity=self.uint16_to_float(vel_raw, self.VEL_MIN, self.VEL_MAX),
            current=self.uint16_to_float(torque_raw, self.TORQUE_MIN, self.TORQUE_MAX),
            temperature=temp_raw / 10.0,
        )

    def matches_feedback(self, msg: can.Message) -> bool:
        """受信メッセージがこのモータのフィードバックか判定する。"""
        comm_type, data_area2, _dest_id = self.parse_can_id(msg.arbitration_id)
        if comm_type != self.COMM_TYPE_FEEDBACK:
            return False
        # data_area2 の Bit7~0 (= Bit15~8 of 29bit ID) がモータ ID
        motor_id = data_area2 & 0xFF
        return motor_id == self.can_id
