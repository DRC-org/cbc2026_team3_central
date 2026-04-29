from __future__ import annotations

import asyncio
import logging

from lib.sequence.engine import Sequence, step

logger = logging.getLogger(__name__)


class MainHandSequence(Sequence):
    """メインハンドのシーケンス (プレースホルダ).

    実機モータが確定したら、各 step 内の logger / sleep を
    実際のモータ呼び出し (CANManager 経由の send_to_bus 等) に置き換える。
    `require_trigger=True` を付けたステップは Web UI の「次へ」ボタン待ち。
    """

    def __init__(self, name: str = "main_hand") -> None:
        super().__init__(name)

    @step("初期位置へ移動")
    async def move_to_home(self) -> None:
        logger.info("[main_hand] 初期位置へ移動")
        # TODO: lift_motor.set_position(0) / arm_joint.set_position(0)
        await asyncio.sleep(0.5)

    @step("ワーク前まで前進", require_trigger=True)
    async def approach_work(self) -> None:
        logger.info("[main_hand] ワーク前まで前進")
        # TODO: lift_motor.set_position(LIFT_APPROACH)
        await asyncio.sleep(0.5)

    @step("アーム展開")
    async def extend_arm(self) -> None:
        logger.info("[main_hand] アーム展開")
        # TODO: arm_joint.set_position(ARM_EXTENDED)
        await asyncio.sleep(0.5)

    @step("ハンド閉じる (ワーク把持)", require_trigger=True)
    async def grip_work(self) -> None:
        logger.info("[main_hand] ハンド閉じる")
        # TODO: gripper.set_position(GRIP_CLOSED)
        await asyncio.sleep(0.3)

    @step("アーム引き戻し")
    async def retract_arm(self) -> None:
        logger.info("[main_hand] アーム引き戻し")
        # TODO: arm_joint.set_position(ARM_RETRACTED)
        await asyncio.sleep(0.5)

    @step("配置位置へ搬送", require_trigger=True)
    async def carry_to_target(self) -> None:
        logger.info("[main_hand] 配置位置へ搬送")
        # TODO: lift_motor.set_position(LIFT_TARGET)
        await asyncio.sleep(0.7)

    @step("ハンド開く (リリース)")
    async def release_work(self) -> None:
        logger.info("[main_hand] ハンド開く")
        # TODO: gripper.set_position(GRIP_OPEN)
        await asyncio.sleep(0.3)

    @step("初期位置へ復帰")
    async def return_home(self) -> None:
        logger.info("[main_hand] 初期位置へ復帰")
        # TODO: 全モータを home 位置へ
        await asyncio.sleep(0.5)
