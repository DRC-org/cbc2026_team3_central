import { useCallback, useMemo } from "react";

import { useRobot } from "@/context/RobotContext";
import type { MotorCheckState } from "@/hooks/useRobotSocket";

interface UseMotorCheckReturn {
  state: MotorCheckState;
  start: () => void;
  abort: () => void;
}

const EMPTY_STATE: MotorCheckState = {
  status: "idle",
  current: null,
  progress: null,
  records: [],
  snapshot: null,
  error: null,
  startedAt: null,
  finishedAt: null,
};

// useRobotSocket が集約した motor_check_* の state を取り出し、
// start/abort のコマンド送信を束ねるだけのプレゼンテーション層 hook
export function useMotorCheck(robot: string): UseMotorCheckReturn {
  const { motorChecks, send } = useRobot();
  const state = motorChecks[robot] ?? EMPTY_STATE;

  const start = useCallback(() => {
    send({ type: "motor_check_start", robot });
  }, [send, robot]);

  const abort = useCallback(() => {
    send({ type: "motor_check_abort", robot });
  }, [send, robot]);

  return useMemo(() => ({ state, start, abort }), [state, start, abort]);
}
