import { Check, ChevronRight, Hand, Play, RotateCcw } from "lucide-react";

import { Icon } from "@/components/Icon";
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
  // 完走後 (stepIndex >= totalSteps): すべて done
  if (stepIndex >= totalSteps) return "done";
  if (i < stepIndex) return "done";
  if (i === stepIndex) return waitingTrigger ? "waiting" : "current";
  return "future";
}

const STEP_BASE =
  "group relative flex min-h-[72px] w-44 shrink-0 flex-col gap-1 rounded-[12px] border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-4";

const STEP_TONE: Record<StepKind, string> = {
  done: "border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-surface)] focus-visible:ring-[color:var(--color-accent)]/30",
  current:
    "border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-white shadow-[var(--shadow-elev)] hover:brightness-110 focus-visible:ring-[color:var(--color-accent)]/40",
  waiting:
    "border-[color:var(--color-warning)] bg-[color:var(--color-warning-soft)] text-[color:oklch(40%_0.16_70)] shadow-[var(--shadow-card)] hover:brightness-105 focus-visible:ring-[color:var(--color-warning)]/40",
  future:
    "border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-2)] focus-visible:ring-[color:var(--color-accent)]/30",
};

export function SequenceStepList({
  steps,
  stepIndex,
  waitingTrigger,
  onJump,
}: SequenceStepListProps) {
  if (steps.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4 text-sm text-[color:var(--color-text-muted)]">
        ステップ情報なし
      </p>
    );
  }

  const totalSteps = steps.length;

  const handleJump = (index: number) => {
    if (index === stepIndex) return;
    const target = steps[index];
    const ok = window.confirm(
      `ステップ ${index + 1} 「${target.label}」 から再開しますか？\n\n` +
        "現在の動作を中断して指定ステップから実行を開始します。\n" +
        "物理状態が安全であることを必ず確認してください。",
    );
    if (ok) onJump(index);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold tracking-wider text-[color:var(--color-text-subtle)] uppercase">
          ステップ一覧
        </h3>
        <span className="flex items-center gap-1 text-xs text-[color:var(--color-text-muted)]">
          <Icon icon={RotateCcw} size={12} />
          クリックで任意の位置から再開
        </span>
      </div>
      <div className="-mx-1 overflow-x-auto px-1 pb-2">
        <ol className="flex items-stretch gap-2">
          {steps.map((step, i) => {
            const kind = classifyStep(i, stepIndex, totalSteps, waitingTrigger);
            // 待機中の矢印強調: 現在ステップ (waiting) → 次ステップ の間
            const arrowHighlighted = waitingTrigger && i === stepIndex;
            return (
              <li key={step.index} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleJump(i)}
                  aria-current={kind === "current" || kind === "waiting" ? "step" : undefined}
                  className={`${STEP_BASE} ${STEP_TONE[kind]}`}
                >
                  <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase opacity-90">
                    <span className="font-mono">#{i + 1}</span>
                    {step.require_trigger ? (
                      <span className="inline-flex items-center gap-0.5">
                        <Icon icon={Hand} size={11} strokeWidth={2.5} />
                        <span>手動</span>
                      </span>
                    ) : null}
                  </span>
                  <span className="line-clamp-2 text-sm leading-tight font-semibold">
                    {step.label}
                  </span>
                  {kind === "done" ? (
                    <span className="absolute top-1.5 right-1.5 text-[color:oklch(55%_0.16_150)]">
                      <Icon icon={Check} size={14} strokeWidth={3} />
                    </span>
                  ) : null}
                  {kind === "current" ? (
                    <span className="absolute top-1.5 right-1.5 text-white/90">
                      <Icon icon={Play} size={12} strokeWidth={3} />
                    </span>
                  ) : null}
                </button>
                {i < steps.length - 1 ? (
                  <Icon
                    icon={ChevronRight}
                    size={20}
                    strokeWidth={3}
                    className={
                      arrowHighlighted
                        ? "animate-pulse text-[color:var(--color-warning)]"
                        : "text-[color:var(--color-border-strong)]"
                    }
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
