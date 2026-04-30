import { Button } from "@heroui/react";
import { AlertTriangle } from "lucide-react";

interface EStopButtonProps {
  onStop: () => void;
}

export function EStopButton({ onStop }: EStopButtonProps) {
  return (
    <div className="e-stop-stripe flex shrink-0 items-center justify-center rounded-[10px] p-[3px]">
      <Button
        variant="danger"
        size="md"
        onPress={onStop}
        aria-label="緊急停止"
        className="rounded-[7px] font-black tracking-wider"
      >
        <AlertTriangle size={20} strokeWidth={2.5} />
        EMG STOP
      </Button>
    </div>
  );
}
