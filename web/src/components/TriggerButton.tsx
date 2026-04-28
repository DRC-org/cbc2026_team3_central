import { Button } from "@heroui/react";

interface TriggerButtonProps {
  waiting: boolean;
  onTrigger: () => void;
}

export function TriggerButton({ waiting, onTrigger }: TriggerButtonProps) {
  return (
    <Button
      variant={waiting ? "primary" : "secondary"}
      size="lg"
      isDisabled={!waiting}
      onPress={onTrigger}
      className="min-h-16 min-w-48 text-lg font-bold"
    >
      {waiting ? "次へ進む ▶" : "実行中..."}
    </Button>
  );
}
