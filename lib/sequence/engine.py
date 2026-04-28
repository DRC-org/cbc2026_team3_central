from __future__ import annotations

import asyncio
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any


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
    def progress(self) -> dict:
        return {
            "sequence": self.name,
            "current_step": self.current_step.label if self.current_step else None,
            "step_index": self._current_index,
            "total_steps": len(self._steps),
            "waiting_trigger": self._waiting_trigger,
            "running": self._running,
        }

    def trigger(self) -> None:
        if self._waiting_trigger:
            self._trigger_event.set()

    async def run(self) -> None:
        self._running = True
        for i, step_info in enumerate(self._steps):
            self._current_index = i
            self._notify_step_change()

            if step_info.require_trigger:
                self._waiting_trigger = True
                self._trigger_event.clear()
                await self._trigger_event.wait()
                self._waiting_trigger = False

            method = getattr(self, step_info.method_name)
            await method()

        self._current_index = len(self._steps)
        self._running = False

    async def reset(self) -> None:
        self._current_index = 0
        self._waiting_trigger = False
        self._running = False
        self._trigger_event.clear()

    def set_on_step_change(self, callback: Callable[[dict], None]) -> None:
        self._on_step_change = callback

    def _notify_step_change(self) -> None:
        if self._on_step_change is not None:
            self._on_step_change(self.progress)
