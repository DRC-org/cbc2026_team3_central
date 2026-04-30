import { Button, Spinner } from "@heroui/react";
import { CheckCircle2, ChevronRight } from "lucide-react";

interface TriggerButtonProps {
  waiting: boolean;
  stepIndex: number;
  totalSteps: number;
  onTrigger: () => void;
}

export function TriggerButton({ waiting, stepIndex, totalSteps, onTrigger }: TriggerButtonProps) {
  // バックエンドは完走時 step_index = total_steps を返す。「最終ステップ実行中」と
  // 「全完走」を分けるため、>= total での判定を採用する
  const isComplete = totalSteps > 0 && stepIndex >= totalSteps && !waiting;

  if (isComplete) {
    return (
      <Button
        isDisabled
        fullWidth
        size="lg"
        variant="secondary"
        className="!h-full !min-h-[88px] gap-3 rounded-[16px] !text-2xl !font-black tracking-wide"
      >
        <CheckCircle2 size={36} strokeWidth={2.5} />
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
        className="trigger-glow !h-full !min-h-[88px] gap-3 rounded-[16px] !text-3xl !font-black tracking-wide"
      >
        <span>次へ進む</span>
        <ChevronRight size={40} strokeWidth={2.6} />
      </Button>
    );
  }

  return (
    <Button
      isDisabled
      fullWidth
      size="lg"
      variant="secondary"
      className="!h-full !min-h-[88px] gap-3 rounded-[16px] !text-2xl !font-black tracking-wide"
    >
      <Spinner size="md" color="current" />
      実行中
    </Button>
  );
}
