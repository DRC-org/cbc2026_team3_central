import { Skeleton } from "@heroui/react";
import { useRobot } from "../context/RobotContext";
import { AppHeader } from "../components/AppHeader";
import { SequenceProgress } from "../components/SequenceProgress";
import { TriggerButton } from "../components/TriggerButton";
import { MotorSummary } from "../components/MotorSummary";
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
    <div className="flex min-h-screen flex-col bg-white">
      <AppHeader title={label} connected={connected} onEStop={onEStop} />

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

      <EStopOverlay active={eStopActive} onRelease={onEStopRelease} />
    </div>
  );
}
