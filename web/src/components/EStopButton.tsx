import { Button } from "@heroui/react";

interface EStopButtonProps {
  onStop: () => void;
}

export function EStopButton({ onStop }: EStopButtonProps) {
  return (
    <div className="e-stop-stripe flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-md p-1">
      <Button
        variant="danger"
        onPress={onStop}
        aria-label="緊急停止"
        className="flex h-full w-full items-center justify-center rounded border-2 border-red-900 text-xs font-black leading-tight"
      >
        EMG
        <br />
        STOP
      </Button>
    </div>
  );
}
