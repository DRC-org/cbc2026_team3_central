import { TuiButton } from "@/components/tui";

interface EStopButtonProps {
  onStop: () => void;
}

// 非常停止トリガ。黄黒のストライプ枠で危険操作を強調しつつ TUI ボタンで発火する。
export function EStopButton({ onStop }: EStopButtonProps) {
  return (
    <span className="e-stop-stripe inline-flex shrink-0 items-center p-[3px]">
      <TuiButton variant="danger" flat onPress={onStop} className="font-bold tracking-wider">
        {"[ ⚠ EMG STOP ]"}
      </TuiButton>
    </span>
  );
}
