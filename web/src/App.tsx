import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { useRobotSocket } from "./hooks/useRobotSocket";
import { RobotProvider } from "./context/RobotContext";
import { AppRoutes } from "./router";

export function App() {
  const socket = useRobotSocket();
  const [eStopActive, setEStopActive] = useState(false);

  useEffect(() => {
    const values = Object.values(socket.states);
    for (const state of values) {
      if ("e_stop_active" in state) {
        setEStopActive((state as Record<string, unknown>).e_stop_active as boolean);
        return;
      }
    }
  }, [socket.states]);

  const handleEStop = () => {
    socket.send({ type: "e_stop" });
    setEStopActive(true);
  };

  const handleEStopRelease = () => {
    socket.send({ type: "e_stop_release" });
    setEStopActive(false);
  };

  return (
    <BrowserRouter>
      <RobotProvider value={socket}>
        <AppRoutes
          eStopActive={eStopActive}
          onEStop={handleEStop}
          onEStopRelease={handleEStopRelease}
        />
      </RobotProvider>
    </BrowserRouter>
  );
}
