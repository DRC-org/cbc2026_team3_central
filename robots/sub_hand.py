from __future__ import annotations

import asyncio
import logging

from lib.sequence.engine import Sequence, step

logger = logging.getLogger(__name__)


class SubHandSequence(Sequence):
    """サブハンドのシーケンス (プレースホルダ).

    メインハンドの補助的な動作を想定。実機構成が決まったら
    各 step 内の logger / sleep を実モータ呼び出しに置き換える。
    """

    def __init__(self, name: str = "sub_hand") -> None:
        super().__init__(name)

    @step("初期位置へ移動")
    async def move_to_home(self) -> None:
        logger.info("[sub_hand] 初期位置へ移動")
        # TODO: 各モータを home 位置へ
        await asyncio.sleep(0.5)

    @step("補助ハンド展開", require_trigger=True)
    async def extend_sub_arm(self) -> None:
        logger.info("[sub_hand] 補助ハンド展開")
        # TODO: sub_arm.set_position(SUB_EXTENDED)
        await asyncio.sleep(0.5)

    @step("ワーク受け取り位置へ")
    async def move_to_handoff(self) -> None:
        logger.info("[sub_hand] ワーク受け取り位置へ")
        # TODO: sub_arm.set_position(HANDOFF_POS)
        await asyncio.sleep(0.5)

    @step("ハンド閉じる (受け取り)", require_trigger=True)
    async def grip_handoff(self) -> None:
        logger.info("[sub_hand] ハンド閉じる")
        # TODO: sub_gripper.set_position(GRIP_CLOSED)
        await asyncio.sleep(0.3)

    @step("配置位置へ移動", require_trigger=True)
    async def move_to_place(self) -> None:
        logger.info("[sub_hand] 配置位置へ移動")
        # TODO: sub_arm.set_position(PLACE_POS)
        await asyncio.sleep(0.6)

    @step("ハンド開く (配置)")
    async def release_at_place(self) -> None:
        logger.info("[sub_hand] ハンド開く")
        # TODO: sub_gripper.set_position(GRIP_OPEN)
        await asyncio.sleep(0.3)

    @step("初期位置へ復帰")
    async def return_home(self) -> None:
        logger.info("[sub_hand] 初期位置へ復帰")
        # TODO: 全モータを home 位置へ
        await asyncio.sleep(0.5)
