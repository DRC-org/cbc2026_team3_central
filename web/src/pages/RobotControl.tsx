import { AlertDialog, Button, Skeleton } from "@heroui/react";
import { Play, Square } from "lucide-react";
import { useState } from "react";

import { MotorSummary } from "@/components/MotorSummary";
import { SequenceProgress } from "@/components/SequenceProgress";
import { SequenceStepList } from "@/components/SequenceStepList";
import { TriggerButton } from "@/components/TriggerButton";
import { useRobot } from "@/context/RobotContext";

interface RobotControlProps {
  robotKey: string;
  label: string;
}

export function RobotControl({ robotKey, label }: RobotControlProps) {
  const { states, send } = useRobot();
  const state = states[robotKey];
  const [stopConfirmOpen, setStopConfirmOpen] = useState(false);

  const handleTrigger = () => {
    send({ type: "trigger", robot: robotKey });
  };

  const handleJump = (stepIndex: number) => {
    send({ type: "sequence_jump", robot: robotKey, step_index: stepIndex });
  };

  const handleConfirmStop = () => {
    send({ type: "sequence_stop", robot: robotKey });
    setStopConfirmOpen(false);
  };

  const handleStart = () => {
    send({ type: "sequence_start", robot: robotKey });
  };

  const completed = state && state.total_steps > 0 && state.step_index >= state.total_steps;
  const idleStopped =
    state &&
    state.total_steps > 0 &&
    !state.waiting_trigger &&
    state.step_index === 0 &&
    !completed;
  const inProgress = state && !state.waiting_trigger && !completed && !idleStopped;
  const showStop = Boolean(inProgress || state?.waiting_trigger);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 md:px-8 md:py-10">
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
              {showStop ? (
                <Button
                  variant="outline"
                  size="lg"
                  onPress={() => setStopConfirmOpen(true)}
                  aria-label="シーケンスを通常停止"
                  className="!min-h-[80px] flex-col rounded-[20px] !text-[color:var(--color-danger)] md:!min-h-full"
                >
                  <Square size={32} strokeWidth={2.4} />
                  <span className="text-base font-bold">停止</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="lg"
                  onPress={handleStart}
                  aria-label="シーケンスを先頭から開始"
                  className="!min-h-[80px] flex-col rounded-[20px] !bg-[color:var(--color-accent-soft)] !text-[color:var(--color-accent)] md:!min-h-full"
                >
                  <Play size={32} strokeWidth={2.4} />
                  <span className="text-base font-bold">開始</span>
                </Button>
              )}
            </div>
          </div>

          <MotorSummary motors={state.motors} />

          <AlertDialog.Backdrop isOpen={stopConfirmOpen} onOpenChange={setStopConfirmOpen}>
            <AlertDialog.Container>
              <AlertDialog.Dialog className="sm:max-w-[420px]">
                <AlertDialog.Header>
                  <AlertDialog.Icon status="warning" />
                  <AlertDialog.Heading>シーケンスを停止しますか？</AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <p>緊急停止 (EMG STOP) ではなく、通常停止です。</p>
                  <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
                    停止後はステップ #1 に戻り、待機状態になります。
                  </p>
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button slot="close" variant="tertiary">
                    キャンセル
                  </Button>
                  <Button slot="close" variant="danger" onPress={handleConfirmStop}>
                    停止
                  </Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
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
