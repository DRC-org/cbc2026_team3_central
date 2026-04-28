import { Button } from "@heroui/react";

interface TriggerButtonProps {
  waiting: boolean;
  stepIndex: number;
  totalSteps: number;
  onTrigger: () => void;
}

export function TriggerButton({ waiting, stepIndex, totalSteps, onTrigger }: TriggerButtonProps) {
  const isComplete = totalSteps > 0 && stepIndex + 1 >= totalSteps && !waiting;

  if (isComplete) {
    return (
      <Button
        variant="ghost"
        size="lg"
        isDisabled
        fullWidth
        className="min-h-[200px] rounded-2xl border-4 border-green-700 bg-green-500 text-4xl font-black tracking-wide text-white shadow-lg"
      >
        完了 ✓
      </Button>
    );
  }

  if (waiting) {
    return (
      <Button
        variant="primary"
        size="lg"
        fullWidth
        onPress={onTrigger}
        className="min-h-[200px] rounded-2xl border-4 border-blue-800 text-4xl font-black tracking-wide shadow-lg"
      >
        次へ進む ▶
      </Button>
    );
  }

  return (
    <Button
      variant="secondary"
      size="lg"
      isDisabled
      fullWidth
      className="min-h-[200px] rounded-2xl border-4 border-gray-400 text-4xl font-black tracking-wide shadow-lg"
    >
      実行中...
    </Button>
  );
}
