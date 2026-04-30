import { Button, Spinner } from "@heroui/react";
import { CheckCircle2, ChevronRight } from "lucide-react";

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
        isDisabled
        fullWidth
        size="lg"
        variant="secondary"
        className="min-h-[200px] rounded-[20px] text-3xl font-black tracking-wide"
      >
        <CheckCircle2 size={48} strokeWidth={2.5} />
        完了
      </Button>
    );
  }

  if (waiting) {
    return (
      <Button
        fullWidth
        size="lg"
        variant="primary"
        onPress={onTrigger}
        aria-label="次のステップへ進む"
        className="min-h-[220px] rounded-[20px] text-3xl font-black tracking-wide"
      >
        <span className="text-5xl">次へ進む</span>
        <ChevronRight size={56} strokeWidth={2.5} />
      </Button>
    );
  }

  return (
    <Button
      isDisabled
      fullWidth
      size="lg"
      variant="secondary"
      className="min-h-[200px] rounded-[20px] text-3xl font-black tracking-wide"
    >
      <Spinner size="md" color="current" />
      実行中
    </Button>
  );
}
