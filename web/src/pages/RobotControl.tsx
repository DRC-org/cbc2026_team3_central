import { Skeleton } from "@heroui/react";

import { MotorSummary } from "../components/MotorSummary";
import { SequenceProgress } from "../components/SequenceProgress";
import { TriggerButton } from "../components/TriggerButton";
import { useRobot } from "../context/RobotContext";

interface RobotControlProps {
  robotKey: string;
  label: string;
}

export function RobotControl({ robotKey, label }: RobotControlProps) {
  const { states, send } = useRobot();
  const state = states[robotKey];

  const handleTrigger = () => {
    send({ type: "trigger", robot: robotKey });
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      {state ? (
        <>
          <section className="rounded-[var(--radius-card)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-card)] md:p-8">
            <SequenceProgress
              sequence={state.sequence}
              currentStep={state.current_step}
              stepIndex={state.step_index}
              totalSteps={state.total_steps}
              waitingTrigger={state.waiting_trigger}
              large
            />
          </section>

          <TriggerButton
            waiting={state.waiting_trigger}
            stepIndex={state.step_index}
            totalSteps={state.total_steps}
            onTrigger={handleTrigger}
          />

          <MotorSummary motors={state.motors} />
        </>
      ) : (
        <div className="rounded-[var(--radius-card)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-8">
          <p className="mb-4 text-sm font-medium text-[color:var(--color-text-muted)]">
            {label} のデータ未受信
          </p>
          <div className="space-y-3">
            <Skeleton className="h-7 w-3/4 rounded" />
            <Skeleton className="h-12 w-1/2 rounded" />
            <Skeleton className="h-3 w-full rounded" />
          </div>
        </div>
      )}
    </main>
  );
}
