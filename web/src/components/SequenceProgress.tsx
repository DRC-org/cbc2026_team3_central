import { Chip, ProgressBar } from "@heroui/react";

interface SequenceProgressProps {
  sequence: string;
  currentStep: string | null;
  stepIndex: number;
  totalSteps: number;
  waitingTrigger: boolean;
  large?: boolean;
}

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

  const statusLabel = isComplete
    ? "✓ 完了"
    : waitingTrigger
      ? "⏳ 許可待ち"
      : "▶ 実行中";

  const statusColor = isComplete ? "success" : waitingTrigger ? "warning" : "accent";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className={`text-gray-500 ${large ? "text-lg" : "text-base"}`}>
          シーケンス:
        </span>
        <span className={`font-bold text-gray-900 ${large ? "text-2xl" : "text-xl"}`}>
          {sequence}
        </span>
      </div>

      <div className={`font-bold text-gray-900 ${large ? "text-3xl" : "text-2xl"}`}>
        ステップ {stepIndex + 1} / {totalSteps}
        <span className="ml-4 text-gray-600">「{currentStep ?? "---"}」</span>
      </div>

      <ProgressBar
        aria-label="シーケンス進行度"
        value={percent}
        color={statusColor}
        size="lg"
        className="h-4"
      >
        <ProgressBar.Track>
          <ProgressBar.Fill />
        </ProgressBar.Track>
      </ProgressBar>

      <div className="flex items-center gap-2">
        <span className={`font-mono text-gray-500 ${large ? "text-lg" : "text-base"}`}>
          {Math.round(percent)}%
        </span>
        <Chip color={statusColor} variant="soft" size="lg" className="text-base font-semibold">
          {statusLabel}
        </Chip>
      </div>
    </div>
  );
}
