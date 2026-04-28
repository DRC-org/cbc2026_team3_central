import { Routes, Route } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { RobotControl } from "./pages/RobotControl";
import { MotorTuning } from "./pages/MotorTuning";

interface AppRoutesProps {
  eStopActive: boolean;
  onEStop: () => void;
  onEStopRelease: () => void;
}

export function AppRoutes({ eStopActive, onEStop, onEStopRelease }: AppRoutesProps) {
  return (
    <Routes>
      <Route
        index
        element={
          <Dashboard eStopActive={eStopActive} onEStop={onEStop} onEStopRelease={onEStopRelease} />
        }
      />
      <Route
        path="main-hand"
        element={
          <RobotControl
            robotKey="main_hand"
            label="メインハンド"
            eStopActive={eStopActive}
            onEStop={onEStop}
            onEStopRelease={onEStopRelease}
          />
        }
      />
      <Route
        path="sub-hand"
        element={
          <RobotControl
            robotKey="sub_hand"
            label="サブハンド"
            eStopActive={eStopActive}
            onEStop={onEStop}
            onEStopRelease={onEStopRelease}
          />
        }
      />
      <Route
        path="motors"
        element={
          <MotorTuning eStopActive={eStopActive} onEStop={onEStop} onEStopRelease={onEStopRelease} />
        }
      />
    </Routes>
  );
}
