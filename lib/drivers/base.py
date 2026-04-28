from __future__ import annotations

import abc
from dataclasses import dataclass
from enum import Enum
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import can


class ControlMode(Enum):
    POSITION = "position"
    VELOCITY = "velocity"
    CURRENT = "current"
    DUTY = "duty"


@dataclass(frozen=True)
class MotorState:
    position: float = 0.0
    velocity: float = 0.0
    current: float = 0.0
    temperature: float = 0.0
    reached: bool = False


class MotorDriver(abc.ABC):
    """モータドライバの基底クラス。各プロトコル固有のドライバはこれを継承する。"""

    def __init__(self, name: str, can_id: int) -> None:
        self.name = name
        self.can_id = can_id
        self._state = MotorState()

    @property
    def state(self) -> MotorState:
        return self._state

    @abc.abstractmethod
    def encode_target(self, mode: ControlMode, value: float) -> can.Message:
        """目標値を CAN メッセージにエンコードする。"""

    @abc.abstractmethod
    def decode_feedback(self, msg: can.Message) -> MotorState:
        """CAN メッセージからフィードバックをデコードする。"""

    def update_state(self, msg: can.Message) -> MotorState:
        """フィードバックメッセージを受けて内部状態を更新する。"""
        self._state = self.decode_feedback(msg)
        return self._state

    @abc.abstractmethod
    def matches_feedback(self, msg: can.Message) -> bool:
        """受信した CAN メッセージがこのモータのフィードバックかどうか判定する。"""
