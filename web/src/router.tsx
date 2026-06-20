import { Outlet, Route, Routes, useLocation } from "react-router-dom";

import { AppHeader } from "@/components/AppHeader";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { EStopOverlay } from "@/components/EStopOverlay";
import { TuiClock, TuiStatusbar } from "@/components/tui";
import { useRobot } from "@/context/RobotContext";
import { Dashboard } from "@/pages/Dashboard";
import { MotorTuning } from "@/pages/MotorTuning";
import { RobotControl } from "@/pages/RobotControl";
import { Background, TuiBackground } from "react-tuicss";

function AppLayout() {
  const { connected, eStopActive, onEStop, onEStopRelease } = useRobot();
  const location = useLocation();

  const statusItems = [
    <ConnectionStatus key="conn" connected={connected} />,
    <span key="estop" className={eStopActive ? "danger-text" : "success-text"}>
      {eStopActive ? "◆ E-STOP ACTIVE" : "◇ E-STOP READY"}
    </span>,
    <span key="route">PATH: {location.pathname}</span>,
    <TuiClock key="clock" />,
  ];

  return (
    <TuiBackground color={Background.BlueWhite}>
      <AppHeader connected={connected} onEStop={onEStop} />
      <main className="tui-col" style={{ flex: "1 1 auto" }}>
        <Outlet />
      </main>
      <TuiStatusbar items={statusItems} fixed={false} />
      <EStopOverlay active={eStopActive} onRelease={onEStopRelease} />
    </TuiBackground>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route
          path="main-hand"
          element={<RobotControl robotKey="main_hand" label="メインハンド" />}
        />
        <Route
          path="sub-hand"
          element={<RobotControl robotKey="sub_hand" label="サブハンド" />}
        />
        <Route path="motors" element={<MotorTuning />} />
      </Route>
    </Routes>
  );
}
