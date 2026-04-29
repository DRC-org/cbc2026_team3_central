import { useCallback } from "react";
import { BrowserRouter } from "react-router-dom";

import { RobotProvider } from "./context/RobotContext";
import { useRobotSocket } from "./hooks/useRobotSocket";
import { AppRoutes } from "./router";

export function App() {
  const socket = useRobotSocket();

  const onEStop = useCallback(() => {
    socket.send({ type: "e_stop" });
    socket.setEStopActive(true);
  }, [socket]);

  const onEStopRelease = useCallback(() => {
    socket.send({ type: "e_stop_release" });
    socket.setEStopActive(false);
  }, [socket]);

  return (
    <BrowserRouter>
      <RobotProvider
        value={{
          states: socket.states,
          connected: socket.connected,
          eStopActive: socket.eStopActive,
          healthEvents: socket.healthEvents,
          motorChecks: socket.motorChecks,
          send: socket.send,
          onEStop,
          onEStopRelease,
        }}
      >
        <AppRoutes />
      </RobotProvider>
    </BrowserRouter>
  );
}
