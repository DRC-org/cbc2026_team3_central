import { createContext, useContext } from "react";
import type { ReactNode } from "react";

import type { RobotState } from "../hooks/useRobotSocket";

interface RobotContextValue {
  states: Record<string, RobotState>;
  connected: boolean;
  eStopActive: boolean;
  send: (data: object) => void;
  onEStop: () => void;
  onEStopRelease: () => void;
}

const RobotContext = createContext<RobotContextValue | null>(null);

export function RobotProvider({
  value,
  children,
}: {
  value: RobotContextValue;
  children: ReactNode;
}) {
  return <RobotContext.Provider value={value}>{children}</RobotContext.Provider>;
}

export function useRobot(): RobotContextValue {
  const ctx = useContext(RobotContext);
  if (!ctx) throw new Error("useRobot must be used within RobotProvider");
  return ctx;
}
