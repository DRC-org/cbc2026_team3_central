import { Link as RouterLink } from "react-router-dom";
import { Skeleton } from "@heroui/react";
import { useRobot } from "../context/RobotContext";
import { ConnectionStatus } from "../components/ConnectionStatus";
import { SequenceProgress } from "../components/SequenceProgress";
import { MotorSummary } from "../components/MotorSummary";
import { EStopButton } from "../components/EStopButton";
import { EStopOverlay } from "../components/EStopOverlay";

interface DashboardProps {
  eStopActive: boolean;
  onEStop: () => void;
  onEStopRelease: () => void;
}

const ROBOTS = [
  { key: "main_hand", label: "メインハンド" },
  { key: "sub_hand", label: "サブハンド" },
] as const;

export function Dashboard({ eStopActive, onEStop, onEStopRelease }: DashboardProps) {
  const { states, connected } = useRobot();

  return (
    <div className="flex min-h-screen flex-col bg-white pb-24">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h1 className="text-3xl font-black text-gray-900">CBC2026 Team3 Dashboard</h1>
        <div className="flex items-center gap-4">
          <RouterLink to="/motors" className="text-sm text-gray-400 hover:text-gray-600">
            モータ詳細 →
          </RouterLink>
          <ConnectionStatus connected={connected} />
        </div>
      </header>

      <main className="grid flex-1 grid-cols-1 gap-0 md:grid-cols-2">
        {ROBOTS.map(({ key, label }) => {
          const state = states[key];
          return (
            <div
              key={key}
              className="flex flex-col gap-6 border-b border-gray-200 p-8 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
            >
              <h2 className="text-3xl font-bold text-gray-900">{label}</h2>

              {state ? (
                <>
                  <SequenceProgress
                    sequence={state.sequence}
                    currentStep={state.current_step}
                    stepIndex={state.step_index}
                    totalSteps={state.total_steps}
                    waitingTrigger={state.waiting_trigger}
                    large
                  />
                  <MotorSummary motors={state.motors} />
                </>
              ) : (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-3/4 rounded" />
                  <Skeleton className="h-6 w-1/2 rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                  <p className="text-lg text-gray-400">データ未受信</p>
                </div>
              )}
            </div>
          );
        })}
      </main>

      <EStopButton onStop={onEStop} />
      <EStopOverlay active={eStopActive} onRelease={onEStopRelease} />
    </div>
  );
}
