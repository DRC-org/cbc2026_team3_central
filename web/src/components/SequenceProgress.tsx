import { TuiProgress, cx, type TuiColor } from "@/components/tui";

interface SequenceProgressProps {
  sequence: string;
  currentStep: string | null;
  stepIndex: number;
  totalSteps: number;
  waitingTrigger: boolean;
  large?: boolean;
}

type StatusKey = "complete" | "waiting" | "running" | "idle";

// TUI 記号 + セマンティック色でステータスを表現する。
const STATUS: Record<StatusKey, { label: string; symbol: string; color: TuiColor }> = {
  complete: { label: "完了", symbol: "✓", color: "success" },
  waiting: { label: "許可待ち", symbol: "▮", color: "warning" },
  running: { label: "実行中", symbol: "►", color: "info" },
  idle: { label: "未開始", symbol: "○", color: "secondary" },
};

export function SequenceProgress({
  sequence,
  currentStep,
  stepIndex,
  totalSteps,
  waitingTrigger,
  large = false,
}: SequenceProgressProps) {
  // バックエンドは完走時に step_index = total_steps を返すため、
  // 表示用には total を超えないようクランプし、% も 0..100 に収める
  const isComplete = totalSteps > 0 && stepIndex >= totalSteps && !waitingTrigger;
  const displayIndex = totalSteps > 0 ? Math.min(stepIndex + 1, totalSteps) : 0;
  const percent =
    totalSteps > 0
      ? Math.min(100, ((isComplete ? totalSteps : stepIndex + 1) / totalSteps) * 100)
      : 0;
  const statusKey: StatusKey =
    totalSteps === 0 ? "idle" : isComplete ? "complete" : waitingTrigger ? "waiting" : "running";
  const status = STATUS[statusKey];

  return (
    <section className="tui-col" style={{ gap: 8 }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="text-xs opacity-70">SEQ</span>
          <span className={cx("truncate font-bold", large ? "text-base" : "text-sm")}>
            {sequence}
          </span>
        </div>
        <span className={cx("shrink-0 whitespace-nowrap font-bold", `${status.color}-text`)}>
          [{status.symbol} {status.label}]
        </span>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className={cx("font-bold tabular-nums", large ? "text-4xl" : "text-3xl")}>
            {displayIndex}
          </span>
          <span className="text-lg opacity-70">/ {totalSteps}</span>
          <span
            className={cx("ml-1 truncate font-semibold", large ? "text-base" : "text-sm")}
            title={currentStep ?? undefined}
          >
            {currentStep ? `› ${currentStep}` : "—"}
          </span>
        </div>
        <span className="shrink-0 tabular-nums font-bold opacity-90">{Math.round(percent)}%</span>
      </div>

      <TuiProgress
        value={percent}
        color={status.color}
        className="w-full"
        showLabel={false}
      />
    </section>
  );
}
