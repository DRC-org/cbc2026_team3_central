import { CheckCircle2, type LucideIcon, Play, Timer } from "lucide-react";

import { Icon } from "./Icon";

interface SequenceProgressProps {
  sequence: string;
  currentStep: string | null;
  stepIndex: number;
  totalSteps: number;
  waitingTrigger: boolean;
  large?: boolean;
}

type StatusKey = "complete" | "waiting" | "running" | "idle";

const STATUS: Record<
  StatusKey,
  { label: string; icon: LucideIcon; tone: string; bar: string; pill: string }
> = {
  complete: {
    label: "完了",
    icon: CheckCircle2,
    tone: "text-[color:oklch(35%_0.16_150)]",
    bar: "bg-[color:var(--color-success)]",
    pill: "bg-[color:var(--color-success-soft)] text-[color:oklch(35%_0.16_150)] ring-1 ring-[color:var(--color-success)]/30",
  },
  waiting: {
    label: "許可待ち",
    icon: Timer,
    tone: "text-[color:oklch(45%_0.16_70)]",
    bar: "bg-[color:var(--color-warning)]",
    pill: "bg-[color:var(--color-warning-soft)] text-[color:oklch(45%_0.16_70)] ring-1 ring-[color:var(--color-warning)]/40",
  },
  running: {
    label: "実行中",
    icon: Play,
    tone: "text-[color:var(--color-accent)]",
    bar: "bg-[color:var(--color-accent)]",
    pill: "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] ring-1 ring-[color:var(--color-accent)]/30",
  },
  idle: {
    label: "未開始",
    icon: Timer,
    tone: "text-[color:var(--color-text-muted)]",
    bar: "bg-[color:var(--color-border-strong)]",
    pill: "bg-[color:var(--color-surface-2)] text-[color:var(--color-text-muted)] ring-1 ring-[color:var(--color-border)]",
  },
};

export function SequenceProgress({
  sequence,
  currentStep,
  stepIndex,
  totalSteps,
  waitingTrigger,
  large = false,
}: SequenceProgressProps) {
  const percent = totalSteps > 0 ? ((stepIndex + 1) / totalSteps) * 100 : 0;
  const isComplete = totalSteps > 0 && stepIndex + 1 >= totalSteps && !waitingTrigger;
  const statusKey: StatusKey =
    totalSteps === 0 ? "idle" : isComplete ? "complete" : waitingTrigger ? "waiting" : "running";
  const status = STATUS[statusKey];

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-xs font-semibold tracking-wider text-[color:var(--color-text-subtle)] uppercase">
          シーケンス
        </span>
        <span
          className={`font-bold text-[color:var(--color-text)] ${large ? "text-xl" : "text-lg"}`}
        >
          {sequence}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status.pill}`}
        >
          <Icon icon={status.icon} size={14} strokeWidth={2.5} />
          {status.label}
        </span>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span
              className={`font-mono font-extrabold text-[color:var(--color-text)] tabular-nums ${
                large ? "text-5xl" : "text-4xl"
              }`}
            >
              {totalSteps > 0 ? stepIndex + 1 : 0}
            </span>
            <span className="text-2xl font-medium text-[color:var(--color-text-subtle)]">
              / {totalSteps}
            </span>
          </div>
          <p
            className={`mt-1 truncate font-semibold ${status.tone} ${large ? "text-xl" : "text-lg"}`}
            title={currentStep ?? undefined}
          >
            {currentStep ?? "—"}
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-3xl font-bold text-[color:var(--color-text-muted)] tabular-nums">
            {Math.round(percent)}
            <span className="ml-0.5 text-base">%</span>
          </div>
        </div>
      </div>

      <div
        role="progressbar"
        aria-label="シーケンス進行度"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative h-3 w-full overflow-hidden rounded-full bg-[color:var(--color-surface-2)]"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-out ${status.bar}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </section>
  );
}
