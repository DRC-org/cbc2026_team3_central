import { useState } from "react";

import { TuiButton, TuiModal, cx } from "@/components/tui";
import type { SequenceStepInfo } from "@/hooks/useRobotSocket";

interface SequenceStepListProps {
  steps: SequenceStepInfo[];
  stepIndex: number;
  waitingTrigger: boolean;
  onJump: (index: number) => void;
}

type StepKind = "done" | "current" | "waiting" | "future";

function classifyStep(
  i: number,
  stepIndex: number,
  totalSteps: number,
  waitingTrigger: boolean,
): StepKind {
  if (stepIndex >= totalSteps) return "done";
  if (i < stepIndex) return "done";
  if (i === stepIndex) return waitingTrigger ? "waiting" : "current";
  return "future";
}

// 状態別の左端マーカー記号。done=済 / current=実行中 / waiting=許可待ち / future=未到達。
const STEP_MARKER: Record<StepKind, string> = {
  done: "✓",
  current: "►",
  waiting: "▮",
  future: "·",
};

// 行全体の文字色（TuiCss セマンティック text クラス）。
const STEP_TONE_CLASS: Record<StepKind, string> = {
  done: "secondary-text",
  current: "info-text",
  waiting: "warning-text",
  future: "",
};

export function SequenceStepList({
  steps,
  stepIndex,
  waitingTrigger,
  onJump,
}: SequenceStepListProps) {
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);

  if (steps.length === 0) {
    return <p className="p-2 text-sm opacity-70">ステップ情報なし</p>;
  }

  const totalSteps = steps.length;
  const target = pendingIndex !== null ? steps[pendingIndex] : null;

  const handleRequestJump = (index: number) => {
    if (index === stepIndex) return;
    setPendingIndex(index);
  };

  const handleConfirm = () => {
    if (pendingIndex !== null) onJump(pendingIndex);
    setPendingIndex(null);
  };

  const handleCancel = () => setPendingIndex(null);

  return (
    <div className="tui-col flex-1" style={{ gap: 6 }}>
      <div className="flex shrink-0 items-center justify-between">
        <h3 className="text-xs font-bold tracking-wider opacity-80">STEP LIST</h3>
        <span className="text-xs opacity-60">クリックで再開</span>
      </div>

      <ol className="tui-scroll flex-1" style={{ display: "flex", flexDirection: "column" }}>
        {steps.map((step, i) => {
          const kind = classifyStep(i, stepIndex, totalSteps, waitingTrigger);
          const isActive = kind === "current" || kind === "waiting";
          return (
            <li key={step.index}>
              <button
                type="button"
                onClick={() => handleRequestJump(i)}
                aria-current={isActive ? "step" : undefined}
                aria-label={`ステップ ${i + 1}: ${step.label}`}
                className={cx(
                  "flex w-full items-center gap-2 px-2 py-1.5 text-left",
                  STEP_TONE_CLASS[kind],
                  isActive && cx("font-bold", kind === "current" ? "info" : "warning"),
                  kind === "waiting" && "animate-pulse",
                )}
                style={{ cursor: "pointer", border: "none", background: "transparent" }}
              >
                <span className={cx("w-4 shrink-0 text-center font-bold tabular-nums")}>
                  {STEP_MARKER[kind]}
                </span>
                <span className="w-7 shrink-0 tabular-nums opacity-80">#{i + 1}</span>
                <span className="w-5 shrink-0 text-center">
                  {step.require_trigger ? "✋" : ""}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <TuiModal
        isOpen={pendingIndex !== null}
        onClose={handleCancel}
        title="STEP JUMP"
        footer={
          <div className="flex justify-end gap-2">
            <TuiButton variant="secondary" flat onPress={handleCancel}>
              キャンセル
            </TuiButton>
            <TuiButton variant="warning" flat onPress={handleConfirm}>
              再開
            </TuiButton>
          </div>
        }
      >
        <p className="font-bold">
          ステップ {pendingIndex !== null ? pendingIndex + 1 : ""}{" "}
          {target ? `「${target.label}」` : ""} から再開しますか？
        </p>
        <p className="mt-2 text-sm opacity-80">
          現在の動作を中断して指定ステップから実行を開始します。
        </p>
        <p className="warning-text mt-2 text-sm font-bold">
          ⚠ 物理状態が安全であることを必ず確認してください。
        </p>
      </TuiModal>
    </div>
  );
}
