import { Routes, Route } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { RobotControl } from "./pages/RobotControl";
import { MotorTuning } from "./pages/MotorTuning";

export function AppRoutes() {
  return (
    <Routes>
      <Route index element={<Dashboard />} />
      <Route path=":robotName" element={<RobotControl />} />
      <Route path=":robotName/motors" element={<MotorTuning />} />
    </Routes>
  );
}
