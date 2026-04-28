import { Link as RouterLink } from "react-router-dom";
import { Skeleton } from "@heroui/react";
import { useRobot } from "../context/RobotContext";
import { ConnectionStatus } from "../components/ConnectionStatus";
import { SequenceProgress } from "../components/SequenceProgress";
import { TriggerButton } from "../components/TriggerButton";
import { MotorSummary } from "../components/MotorSummary";
import { EStopButton } from "../components/EStopButton";
import { EStopOverlay } from "../components/EStopOverlay";

interface RobotControlProps {
  robotKey: string;
  label: string;
  eStopActive: boolean;
  onEStop: () => void;
  onEStopRelease: () => void;
}

export function RobotControl({
  robotKey,
  label,
  eStopActive,
  onEStop,
  onEStopRelease,
}: RobotControlProps) {
  const { states, connected, send } = useRobot();
  const state = states[robotKey];

  const handleTrigger = () => {
    send({ type: "trigger", robot: robotKey });
  };

  return (
    <div className="flex min-h-screen flex-col bg-white pb-24">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h1 className="text-3xl font-black text-gray-900">{label}</h1>
        <div className="flex items-center gap-4">
          <RouterLink to="/motors" className="text-sm text-gray-400 hover:text-gray-600">
            モータ詳細 →
          </RouterLink>
          <ConnectionStatus connected={connected} />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-6">
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

            <div className="flex flex-1 items-center">
              <TriggerButton
                waiting={state.waiting_trigger}
                stepIndex={state.step_index}
                totalSteps={state.total_steps}
                onTrigger={handleTrigger}
              />
            </div>

            <MotorSummary motors={state.motors} />
          </>
        ) : (
          <div className="space-y-4 py-8">
            <Skeleton className="h-8 w-3/4 rounded" />
            <Skeleton className="h-6 w-1/2 rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <p className="text-lg text-gray-400">データ未受信</p>
          </div>
        )}
      </main>

      <EStopButton onStop={onEStop} />
      <EStopOverlay active={eStopActive} onRelease={onEStopRelease} />
    </div>
  );
}
