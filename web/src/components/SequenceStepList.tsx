import { AlertDialog, Button } from "@heroui/react";
import { Check, ChevronRight, Hand, Play, RotateCcw } from "lucide-react";
import { useState } from "react";

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

const STEP_TONE_CLASS: Record<StepKind, string> = {
  done: "!bg-[color:var(--color-surface-2)] !text-[color:var(--color-text-muted)] !border-[color:var(--color-border)]",
  current:
    "!bg-[color:var(--color-accent)] !text-white !border-[color:var(--color-accent)] !shadow-[var(--shadow-elev)]",
  waiting:
    "!bg-[color:var(--color-warning-soft)] !text-[color:oklch(40%_0.16_70)] !border-[color:var(--color-warning)] !shadow-[var(--shadow-card)]",
  future:
    "!bg-[color:var(--color-surface)] !text-[color:var(--color-text)] !border-[color:var(--color-border)]",
};

export function SequenceStepList({
  steps,
  stepIndex,
  waitingTrigger,
  onJump,
}: SequenceStepListProps) {
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  if (steps.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4 text-sm text-[color:var(--color-text-muted)]">
        ステップ情報なし
      </p>
    );
  }

  const totalSteps = steps.length;
  const target = pendingIndex !== null ? steps[pendingIndex] : null;

  const handleRequestJump = (index: number) => {
    if (index === stepIndex) return;
    setPendingIndex(index);
    setIsOpen(true);
  };

  const handleConfirm = () => {
    if (pendingIndex !== null) onJump(pendingIndex);
    setIsOpen(false);
    setPendingIndex(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold tracking-wider text-[color:var(--color-text-subtle)] uppercase">
          ステップ一覧
        </h3>
        <span className="flex items-center gap-1 text-xs text-[color:var(--color-text-muted)]">
          <RotateCcw size={12} />
          クリックで任意の位置から再開
        </span>
      </div>
      <div className="-mx-1 overflow-x-auto px-1 pb-2">
        <ol className="flex items-stretch gap-2">
          {steps.map((step, i) => {
            const kind = classifyStep(i, stepIndex, totalSteps, waitingTrigger);
            const arrowHighlighted = waitingTrigger && i === stepIndex;
            return (
              <li key={step.index} className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="md"
                  onPress={() => handleRequestJump(i)}
                  aria-current={kind === "current" || kind === "waiting" ? "step" : undefined}
                  aria-label={`ステップ ${i + 1}: ${step.label}`}
                  className={`relative !h-auto !min-h-[72px] !w-44 shrink-0 flex-col !items-start !justify-start gap-1 rounded-[12px] !px-3 !py-2.5 text-left ${STEP_TONE_CLASS[kind]}`}
                >
                  <span className="flex w-full items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase opacity-90">
                    <span className="font-mono">#{i + 1}</span>
                    {step.require_trigger ? (
                      <span className="inline-flex items-center gap-0.5">
                        <Hand size={11} strokeWidth={2.5} />
                        <span>手動</span>
                      </span>
                    ) : null}
                  </span>
                  <span className="line-clamp-2 w-full text-sm leading-tight font-semibold">
                    {step.label}
                  </span>
                  {kind === "done" ? (
                    <span className="absolute top-1.5 right-1.5 text-[color:oklch(55%_0.16_150)]">
                      <Check size={14} strokeWidth={3} />
                    </span>
                  ) : null}
                  {kind === "current" ? (
                    <span className="absolute top-1.5 right-1.5 text-white/90">
                      <Play size={12} strokeWidth={3} />
                    </span>
                  ) : null}
                </Button>
                {i < steps.length - 1 ? (
                  <ChevronRight
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

      <AlertDialog.Backdrop isOpen={isOpen} onOpenChange={setIsOpen}>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[440px]">
            <AlertDialog.Header>
              <AlertDialog.Icon status="warning" />
              <AlertDialog.Heading>
                ステップ {pendingIndex !== null ? pendingIndex + 1 : ""}{" "}
                {target ? `「${target.label}」` : ""} から再開しますか？
              </AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>現在の動作を中断して指定ステップから実行を開始します。</p>
              <p className="mt-2 text-sm font-semibold text-[color:var(--color-danger)]">
                物理状態が安全であることを必ず確認してください。
              </p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary">
                キャンセル
              </Button>
              <Button slot="close" onPress={handleConfirm}>
                再開
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </div>
  );
}
