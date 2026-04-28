import { BrowserRouter } from "react-router-dom";
import { useRobotSocket } from "./hooks/useRobotSocket";
import { EStopButton } from "./components/EStopButton";
import { AppRoutes } from "./router";

export function App() {
  const { states, connected, send } = useRobotSocket();

  const handleEStop = () => {
    send({ type: "e_stop" });
  };

  return (
    <BrowserRouter>
      <AppRoutes states={states} connected={connected} send={send} />
      <EStopButton onStop={handleEStop} />
    </BrowserRouter>
  );
}
