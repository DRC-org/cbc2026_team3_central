import { AlertDialog, Button, ScrollShadow } from "@heroui/react";
import { Check, ChevronDown, Hand, Play } from "lucide-react";
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

const ARROW_TONE_CLASS: Record<StepKind, string> = {
  done: "text-[color:oklch(55%_0.16_150)]",
  current: "text-[color:var(--color-accent)]",
  waiting: "animate-pulse text-[color:var(--color-warning)]",
  future: "text-[color:var(--color-border-strong)]",
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
      <p className="rounded-[var(--radius-card)] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-3 text-xs text-[color:var(--color-text-muted)]">
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
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between">
        <h3 className="text-[10px] font-bold tracking-wider text-[color:var(--color-text-subtle)] uppercase">
          ステップ一覧
        </h3>
        <span className="text-[10px] text-[color:var(--color-text-muted)]">クリックで再開</span>
      </div>

      <ScrollShadow className="min-h-0 flex-1" hideScrollBar size={24}>
        <ol className="flex flex-col">
          {steps.map((step, i) => {
            const kind = classifyStep(i, stepIndex, totalSteps, waitingTrigger);
            return (
              <li key={step.index} className="flex flex-col">
                <Button
                  variant="outline"
                  size="md"
                  onPress={() => handleRequestJump(i)}
                  aria-current={kind === "current" || kind === "waiting" ? "step" : undefined}
                  aria-label={`ステップ ${i + 1}: ${step.label}`}
                  className={`!h-auto !min-h-[52px] !w-full justify-between gap-2 rounded-[10px] !px-3 !py-2 text-left ${STEP_TONE_CLASS[kind]}`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="font-mono text-[11px] font-bold opacity-80">#{i + 1}</span>
                    {step.require_trigger ? (
                      <Hand size={12} strokeWidth={2.5} className="shrink-0 opacity-80" />
                    ) : null}
                    <span className="truncate text-sm leading-tight font-semibold">
                      {step.label}
                    </span>
                  </span>
                  <span className="shrink-0">
                    {kind === "done" ? <Check size={14} strokeWidth={3} /> : null}
                    {kind === "current" ? <Play size={14} strokeWidth={3} /> : null}
                  </span>
                </Button>
                {i < steps.length - 1 ? (
                  <div className="flex h-3 items-center justify-center">
                    <ChevronDown size={14} strokeWidth={3} className={ARROW_TONE_CLASS[kind]} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      </ScrollShadow>

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
