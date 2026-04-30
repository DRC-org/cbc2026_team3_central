import { Skeleton } from "@heroui/react";
import { Play, Square } from "lucide-react";

import { Icon } from "../components/Icon";
import { MotorSummary } from "../components/MotorSummary";
import { SequenceProgress } from "../components/SequenceProgress";
import { SequenceStepList } from "../components/SequenceStepList";
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

  const handleJump = (stepIndex: number) => {
    send({ type: "sequence_jump", robot: robotKey, step_index: stepIndex });
  };

  const handleStop = () => {
    const ok = window.confirm(
      "シーケンスを停止しますか？\n\n緊急停止 (EMG STOP) ではなく、通常停止です。\n停止後はステップ #1 に戻り、待機状態になります。",
    );
    if (ok) send({ type: "sequence_stop", robot: robotKey });
  };

  const handleStart = () => {
    send({ type: "sequence_start", robot: robotKey });
  };

  // 状態判定: 完走済み or stopped 後 (running=false) は idle として扱う
  const completed = state && state.total_steps > 0 && state.step_index >= state.total_steps;
  const idleStopped =
    state &&
    state.total_steps > 0 &&
    !state.waiting_trigger &&
    state.step_index === 0 &&
    !completed;
  const inProgress = state && !state.waiting_trigger && !completed && !idleStopped;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
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

          <section className="rounded-[var(--radius-card)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-card)] md:p-6">
            <SequenceStepList
              steps={state.steps ?? []}
              stepIndex={state.step_index}
              waitingTrigger={state.waiting_trigger}
              onJump={handleJump}
            />
          </section>

          <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
            <div className="flex-1">
              <TriggerButton
                waiting={state.waiting_trigger}
                stepIndex={state.step_index}
                totalSteps={state.total_steps}
                onTrigger={handleTrigger}
              />
            </div>
            <div className="flex flex-col gap-3 md:w-48">
              {inProgress || state.waiting_trigger ? (
                <button
                  type="button"
                  onClick={handleStop}
                  aria-label="シーケンスを通常停止"
                  className="flex h-full min-h-[80px] flex-col items-center justify-center gap-1.5 rounded-[20px] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface)] px-4 py-3 text-[color:var(--color-danger)] shadow-[var(--shadow-card)] transition hover:bg-[color:var(--color-danger-soft)] focus-visible:ring-4 focus-visible:ring-[color:var(--color-danger)]/30 focus-visible:outline-none active:translate-y-px md:min-h-full"
                >
                  <Icon icon={Square} size={32} strokeWidth={2.4} />
                  <span className="text-base font-bold">停止</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStart}
                  aria-label="シーケンスを先頭から開始"
                  className="flex h-full min-h-[80px] flex-col items-center justify-center gap-1.5 rounded-[20px] border border-[color:var(--color-accent)]/40 bg-[color:var(--color-accent-soft)] px-4 py-3 text-[color:var(--color-accent)] shadow-[var(--shadow-card)] transition hover:bg-[color:var(--color-accent)] hover:text-white focus-visible:ring-4 focus-visible:ring-[color:var(--color-accent)]/30 focus-visible:outline-none active:translate-y-px md:min-h-full"
                >
                  <Icon icon={Play} size={32} strokeWidth={2.4} />
                  <span className="text-base font-bold">開始</span>
                </button>
              )}
            </div>
          </div>

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
