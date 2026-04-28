import { Routes, Route } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { RobotControl } from "./pages/RobotControl";
import { MotorTuning } from "./pages/MotorTuning";
import type { RobotState } from "./hooks/useRobotSocket";

interface AppRoutesProps {
  states: Record<string, RobotState>;
  connected: boolean;
  send: (data: object) => void;
}

export function AppRoutes({ states, connected, send }: AppRoutesProps) {
  return (
    <Routes>
      <Route index element={<Dashboard states={states} connected={connected} />} />
      <Route path=":robotName" element={<RobotControl states={states} send={send} />} />
      <Route path=":robotName/motors" element={<MotorTuning states={states} send={send} />} />
    </Routes>
  );
}
