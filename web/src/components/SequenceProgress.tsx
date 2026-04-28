import { Chip, ProgressBar } from "@heroui/react";

interface SequenceProgressProps {
  sequence: string;
  currentStep: string | null;
  stepIndex: number;
  totalSteps: number;
  waitingTrigger: boolean;
}

export function SequenceProgress({
  sequence,
  currentStep,
  stepIndex,
  totalSteps,
  waitingTrigger,
}: SequenceProgressProps) {
  const percent = totalSteps > 0 ? ((stepIndex + 1) / totalSteps) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">シーケンス:</span>
        <span className="font-semibold text-gray-900">{sequence}</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-lg font-medium text-gray-800">
          {currentStep ?? "---"}
        </span>
        {waitingTrigger && (
          <Chip color="warning" variant="soft" size="sm">
            操縦者の許可待ち
          </Chip>
        )}
      </div>

      <ProgressBar
        aria-label="シーケンス進行度"
        value={percent}
        color={waitingTrigger ? "warning" : "accent"}
        size="md"
      >
        <ProgressBar.Track>
          <ProgressBar.Fill />
        </ProgressBar.Track>
      </ProgressBar>

      <p className="text-sm text-gray-500">
        ステップ {stepIndex + 1} / {totalSteps}
      </p>
    </div>
  );
}
