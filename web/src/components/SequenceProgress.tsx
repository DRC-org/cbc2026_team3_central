import { Chip, ProgressBar } from "@heroui/react";
import { CheckCircle2, type LucideIcon, Play, Timer } from "lucide-react";

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
  {
    label: string;
    icon: LucideIcon;
    chipColor: "success" | "warning" | "accent" | "default";
    tone: string;
  }
> = {
  complete: {
    label: "完了",
    icon: CheckCircle2,
    chipColor: "success",
    tone: "text-[color:oklch(35%_0.16_150)]",
  },
  waiting: {
    label: "許可待ち",
    icon: Timer,
    chipColor: "warning",
    tone: "text-[color:oklch(45%_0.16_70)]",
  },
  running: {
    label: "実行中",
    icon: Play,
    chipColor: "accent",
    tone: "text-[color:var(--color-accent)]",
  },
  idle: {
    label: "未開始",
    icon: Timer,
    chipColor: "default",
    tone: "text-[color:var(--color-text-muted)]",
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
  const StatusIcon = status.icon;

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
        <Chip color={status.chipColor} variant="soft" size="md">
          <StatusIcon size={14} strokeWidth={2.5} />
          <Chip.Label>{status.label}</Chip.Label>
        </Chip>
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
      </div>

      <ProgressBar aria-label="シーケンス進行度" value={percent} className="w-full">
        <ProgressBar.Output />
        <ProgressBar.Track>
          <ProgressBar.Fill />
        </ProgressBar.Track>
      </ProgressBar>
    </section>
  );
}
