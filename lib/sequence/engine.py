from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class StepInfo:
    label: str
    method_name: str
    require_trigger: bool


def step(label: str, *, require_trigger: bool = False) -> Callable:
    def decorator(method: Callable) -> Callable:
        method._step_label = label  # type: ignore[attr-defined]
        method._step_require_trigger = require_trigger  # type: ignore[attr-defined]
        return method

    return decorator


class Sequence:
    _steps: list[StepInfo]

    def __init_subclass__(cls, **kwargs: Any) -> None:
        super().__init_subclass__(**kwargs)
        steps: list[StepInfo] = []
        for name, value in cls.__dict__.items():
            if callable(value) and hasattr(value, "_step_label"):
                steps.append(
                    StepInfo(
                        label=value._step_label,
                        method_name=name,
                        require_trigger=value._step_require_trigger,
                    )
                )
        cls._steps = steps

    def __init__(self, name: str) -> None:
        self.name = name
        self._current_index: int = 0
        self._waiting_trigger: bool = False
        self._running: bool = False
        self._trigger_event: asyncio.Event = asyncio.Event()
        # request_stop で run() ループを抜けさせるイベント
        self._stop_event: asyncio.Event = asyncio.Event()
        # 通常停止・完走後に外部から再開要求を受けるためのイベント
        self._resume_event: asyncio.Event = asyncio.Event()
        # request_jump で次の反復に反映する目標 index
        self._jump_request: int | None = None
        self._on_step_change: Callable[[dict], None] | None = None

    @property
    def current_step(self) -> StepInfo | None:
        if 0 <= self._current_index < len(self._steps):
            return self._steps[self._current_index]
        return None

    @property
    def waiting_trigger(self) -> bool:
        return self._waiting_trigger

    @property
    def steps_info(self) -> list[dict]:
        return [
            {"index": i, "label": s.label, "require_trigger": s.require_trigger}
            for i, s in enumerate(self._steps)
        ]

    @property
    def progress(self) -> dict:
        return {
            "sequence": self.name,
            "current_step": self.current_step.label if self.current_step else None,
            "step_index": self._current_index,
            "total_steps": len(self._steps),
            "waiting_trigger": self._waiting_trigger,
            "running": self._running,
            "steps": self.steps_info,
        }

    def trigger(self) -> None:
        if self._waiting_trigger:
            self._trigger_event.set()

    def request_jump(self, index: int) -> None:
        """指定インデックスへジャンプ。実行中なら次の境界で反映、停止中なら再開。"""
        if not (0 <= index < len(self._steps)):
            return
        self._jump_request = index
        if self._running:
            # 実行中: トリガー待機を解除してジャンプを反映させる
            self._trigger_event.set()
        else:
            # 通常停止後・完走後: 再開イベントで run() ループを起こす
            self._resume_event.set()

    def request_stop(self) -> None:
        """通常停止 (緊急停止と異なり CAN 層には介入しない)。"""
        self._stop_event.set()
        if self._waiting_trigger:
            self._trigger_event.set()

    def request_start(self) -> None:
        """先頭から実行開始。完走後・停止後の再起動に使う。"""
        self._jump_request = 0
        self._resume_event.set()

    async def run(self) -> None:
        self._running = True
        self._stop_event.clear()
        try:
            while not self._stop_event.is_set():
                if self._jump_request is not None:
                    self._current_index = self._jump_request
                    self._jump_request = None
                if self._current_index >= len(self._steps):
                    break
                step_info = self._steps[self._current_index]
                self._notify_step_change()

                if step_info.require_trigger:
                    self._waiting_trigger = True
                    self._trigger_event.clear()
                    await self._trigger_event.wait()
                    self._waiting_trigger = False
                    if self._stop_event.is_set():
                        break
                    if self._jump_request is not None:
                        continue

                method = getattr(self, step_info.method_name)
                try:
                    await method()
                except asyncio.CancelledError:
                    raise
                except Exception:
                    logger.exception(
                        "シーケンス '%s' のステップ '%s' で例外", self.name, step_info.label
                    )
                    break

                if self._jump_request is None:
                    self._current_index += 1
        finally:
            self._running = False
            self._waiting_trigger = False

    async def reset(self) -> None:
        self._current_index = 0
        self._waiting_trigger = False
        self._running = False
        self._trigger_event.clear()
        self._stop_event.clear()
        self._jump_request = None

    def set_on_step_change(self, callback: Callable[[dict], None]) -> None:
        self._on_step_change = callback

    def _notify_step_change(self) -> None:
        if self._on_step_change is not None:
            self._on_step_change(self.progress)
