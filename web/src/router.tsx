import { Outlet, Route, Routes, useLocation } from "react-router-dom";

import { AppHeader } from "./components/AppHeader";
import { EStopOverlay } from "./components/EStopOverlay";
import { useRobot } from "./context/RobotContext";
import { Dashboard } from "./pages/Dashboard";
import { MotorTuning } from "./pages/MotorTuning";
import { RobotControl } from "./pages/RobotControl";

interface PageMeta {
  title: string;
  subtitle?: string;
}

const PAGE_META: Record<string, PageMeta> = {
  "/": { title: "ロボットステータス", subtitle: "メインハンド + サブハンド 統合ビュー" },
  "/main-hand": { title: "メインハンド", subtitle: "シーケンス操縦" },
  "/sub-hand": { title: "サブハンド", subtitle: "シーケンス操縦" },
  "/motors": { title: "モータ調整", subtitle: "PID パラメータ・状態モニタ" },
};

function AppLayout() {
  const { connected, eStopActive, onEStop, onEStopRelease } = useRobot();
  const location = useLocation();
  const meta = PAGE_META[location.pathname] ?? { title: "CBC2026 Team3" };

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--color-bg)] text-[color:var(--color-text)]">
      <AppHeader title={meta.title} connected={connected} onEStop={onEStop} />
      <Outlet />
      <EStopOverlay active={eStopActive} onRelease={onEStopRelease} />
    </div>
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
        <Route path="sub-hand" element={<RobotControl robotKey="sub_hand" label="サブハンド" />} />
        <Route path="motors" element={<MotorTuning />} />
      </Route>
    </Routes>
  );
}
