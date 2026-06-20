import { useState } from "react";

import { HealthIndicator } from "@/components/HealthIndicator";
import { MotorSummary } from "@/components/MotorSummary";
import { SequenceProgress } from "@/components/SequenceProgress";
import { SequenceStepList } from "@/components/SequenceStepList";
import { TriggerButton } from "@/components/TriggerButton";
import { TuiButton, TuiModal } from "@/components/tui";
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

  if (!state) {
    return (
      <main className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-6">
        <div className="tui-window">
          <fieldset className="tui-fieldset">
            <legend>{label}</legend>
            <p className="px-2 py-4 opacity-80">データ未受信 — 接続待機中...</p>
          </fieldset>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(280px,340px)_minmax(280px,340px)] gap-3 overflow-hidden p-3">
      {/* 左カラム: シーケンス概観 + コントロールバー */}
      <div className="tui-col gap-3 overflow-hidden">
        <div className="tui-window shrink-0">
          <fieldset className="tui-fieldset">
            <legend>SEQUENCE</legend>
            <SequenceProgress
              sequence={state.sequence}
              currentStep={state.current_step}
              stepIndex={state.step_index}
              totalSteps={state.total_steps}
              waitingTrigger={state.waiting_trigger}
              large
            />
          </fieldset>
        </div>

        <div className="flex-1" aria-hidden="true" />

        {/* 開始/停止 + TriggerButton。180px 固定 + 残りで横並び。 */}
        <div className="grid shrink-0 grid-cols-[180px_1fr] gap-3" style={{ minHeight: 88 }}>
          {showStop ? (
            <TuiButton
              variant="danger"
              flat
              onPress={() => setStopConfirmOpen(true)}
              aria-label="シーケンスを通常停止"
              className="flex h-full w-full items-center justify-center gap-2 text-xl font-black"
            >
              ■ STOP
            </TuiButton>
          ) : (
            <TuiButton
              variant="success"
              flat
              onPress={handleStart}
              aria-label="シーケンスを先頭から開始"
              className="flex h-full w-full items-center justify-center gap-2 text-xl font-black"
            >
              ► START
            </TuiButton>
          )}
          <TriggerButton
            waiting={state.waiting_trigger}
            stepIndex={state.step_index}
            totalSteps={state.total_steps}
            onTrigger={handleTrigger}
          />
        </div>
      </div>

      {/* 中カラム: ステップ一覧 (縦スタック) */}
      <div className="tui-window tui-fill overflow-hidden">
        <fieldset className="tui-fieldset tui-fill">
          <legend>STEPS</legend>
          <SequenceStepList
            steps={state.steps ?? []}
            stepIndex={state.step_index}
            waitingTrigger={state.waiting_trigger}
            onJump={handleJump}
          />
        </fieldset>
      </div>

      {/* 右カラム: CAN Bus + モータ */}
      <div className="tui-col gap-3 overflow-hidden">
        <div className="tui-window shrink-0">
          <fieldset className="tui-fieldset">
            <legend>CAN BUS</legend>
            <HealthIndicator variant="bus-only" health={state.health} />
          </fieldset>
        </div>
        <div className="tui-window tui-fill flex-1 overflow-hidden">
          <fieldset className="tui-fieldset tui-fill">
            <legend>MOTORS</legend>
            <MotorSummary motors={state.motors} compact />
          </fieldset>
        </div>
      </div>

      <TuiModal
        isOpen={stopConfirmOpen}
        onClose={() => setStopConfirmOpen(false)}
        title="STOP SEQUENCE"
        footer={
          <div className="flex justify-end gap-2">
            <TuiButton variant="secondary" flat onPress={() => setStopConfirmOpen(false)}>
              キャンセル
            </TuiButton>
            <TuiButton variant="danger" flat onPress={handleConfirmStop}>
              停止
            </TuiButton>
          </div>
        }
      >
        <p className="font-bold">シーケンスを停止しますか？</p>
        <p className="mt-2 text-sm opacity-80">
          ⚠ 緊急停止 (EMG STOP) ではなく、通常停止です。
        </p>
        <p className="mt-1 text-sm opacity-80">
          停止後はステップ #1 に戻り、待機状態になります。
        </p>
      </TuiModal>
    </main>
  );
}
