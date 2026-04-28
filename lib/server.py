from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import pathlib
from dataclasses import dataclass

from aiohttp import WSMsgType, web

from lib.can_manager import CANManager
from lib.drivers.generic import GenericDriver
from lib.sequence.engine import Sequence

logger = logging.getLogger(__name__)

_WEB_DIST_DIR = pathlib.Path(__file__).resolve().parent.parent / "web" / "dist"


@dataclass
class RobotContext:
    sequence: Sequence
    can_manager: CANManager


class RobotServer:
    def __init__(self, host: str = "0.0.0.0", port: int = 8080) -> None:
        self._host = host
        self._port = port
        self._app: web.Application | None = None
        self._robots: dict[str, RobotContext] = {}
        self._ws_clients: set[web.WebSocketResponse] = set()
        self._broadcast_interval: float = 0.05
        self._broadcast_task: asyncio.Task[None] | None = None

    def add_robot(self, name: str, sequence: Sequence, can_manager: CANManager) -> None:
        self._robots[name] = RobotContext(sequence=sequence, can_manager=can_manager)

    def create_app(self) -> web.Application:
        app = web.Application()
        app.router.add_get("/ws", self._ws_handler)

        if _WEB_DIST_DIR.is_dir():
            app.router.add_static("/assets", _WEB_DIST_DIR / "assets")
            app.router.add_get("/{path:.*}", self._spa_handler)

        app.on_startup.append(self._on_startup)
        app.on_shutdown.append(self._on_shutdown)

        self._app = app
        return app

    async def _spa_handler(self, request: web.Request) -> web.StreamResponse:
        """SPA フォールバック: 静的ファイルがあればそれを返し、なければ index.html を返す"""
        path = request.match_info.get("path", "")
        file_path = _WEB_DIST_DIR / path
        if path and file_path.is_file():
            return web.FileResponse(file_path)
        return web.FileResponse(_WEB_DIST_DIR / "index.html")

    async def _on_startup(self, app: web.Application) -> None:
        self._broadcast_task = asyncio.create_task(self._broadcast_loop())

    async def _on_shutdown(self, app: web.Application) -> None:
        if self._broadcast_task is not None:
            self._broadcast_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._broadcast_task

        for ws in set(self._ws_clients):
            await ws.close()
        self._ws_clients.clear()

    async def _ws_handler(self, request: web.Request) -> web.WebSocketResponse:
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        self._ws_clients.add(ws)
        logger.info("WebSocket 接続: %s", request.remote)

        try:
            async for msg in ws:
                if msg.type == WSMsgType.TEXT:
                    try:
                        data = json.loads(msg.data)
                    except json.JSONDecodeError:
                        logger.warning("不正な JSON を受信: %s", msg.data)
                        continue
                    await self._handle_command(data)
                elif msg.type == WSMsgType.ERROR:
                    logger.error("WebSocket エラー: %s", ws.exception())
        finally:
            self._ws_clients.discard(ws)
            logger.info("WebSocket 切断: %s", request.remote)

        return ws

    async def _handle_command(self, data: dict) -> None:
        cmd_type = data.get("type")

        if cmd_type == "trigger":
            robot_name = data.get("robot")
            if robot_name and robot_name in self._robots:
                self._robots[robot_name].sequence.trigger()
                logger.info("trigger: %s", robot_name)

        elif cmd_type == "e_stop":
            logger.warning("緊急停止コマンド受信")
            e_stop_msg = GenericDriver.encode_e_stop()
            for name, ctx in self._robots.items():
                for bus_name in ctx.can_manager._buses:
                    await ctx.can_manager.send_to_bus(bus_name, e_stop_msg)
                logger.info("E-STOP 送信: %s", name)

        elif cmd_type == "set_param":
            motor_name = data.get("motor")
            key = data.get("key")
            value = data.get("value")
            logger.info("set_param: motor=%s key=%s value=%s", motor_name, key, value)

        else:
            logger.debug("未知のコマンド: %s", cmd_type)

    async def _broadcast_loop(self) -> None:
        while True:
            await self._broadcast_state()
            await asyncio.sleep(self._broadcast_interval)

    async def _broadcast_state(self) -> None:
        if not self._ws_clients:
            return

        messages: list[str] = []
        for robot_name in self._robots:
            state = self._build_state_message(robot_name)
            messages.append(json.dumps(state, ensure_ascii=False))

        dead: set[web.WebSocketResponse] = set()
        for ws in self._ws_clients:
            if ws.closed:
                dead.add(ws)
                continue
            for msg_text in messages:
                try:
                    await ws.send_str(msg_text)
                except ConnectionResetError:
                    dead.add(ws)
                    break

        self._ws_clients -= dead

    def _build_state_message(self, robot_name: str) -> dict:
        ctx = self._robots[robot_name]
        progress = ctx.sequence.progress

        motors: dict[str, dict] = {}
        for motor_name, motor in ctx.can_manager._motors.items():
            s = motor.state
            motors[motor_name] = {
                "pos": s.position,
                "vel": s.velocity,
                "torque": s.current,
                "temp": s.temperature,
            }

        return {
            "type": "state",
            "robot": robot_name,
            "sequence": progress["sequence"],
            "current_step": progress["current_step"],
            "step_index": progress["step_index"],
            "total_steps": progress["total_steps"],
            "waiting_trigger": progress["waiting_trigger"],
            "motors": motors,
        }

    async def start(self) -> None:
        app = self.create_app()
        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, self._host, self._port)
        await site.start()
        logger.info("サーバー起動: http://%s:%d", self._host, self._port)

        try:
            await asyncio.Event().wait()
        finally:
            await runner.cleanup()

    async def cleanup(self) -> None:
        for ws in set(self._ws_clients):
            await ws.close()
        self._ws_clients.clear()
