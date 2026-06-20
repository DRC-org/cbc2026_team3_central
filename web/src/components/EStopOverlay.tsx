import { TuiButton } from "@/components/tui";

interface EStopOverlayProps {
  active: boolean;
  onRelease: () => void;
}

// 等幅アスキー枠の警告バナー。点滅は CSS(.tui-estop-overlay)側で制御。
const BANNER = [
  "##############################################",
  "##                                          ##",
  "##        !!  EMERGENCY  STOP  !!           ##",
  "##                                          ##",
  "##############################################",
].join("\n");

export function EStopOverlay({ active, onRelease }: EStopOverlayProps) {
  if (!active) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="緊急停止状態 — 解除するには解除ボタンを押してください"
      className="tui-estop-overlay"
    >
      <pre className="tui-estop-frame tui-estop-title" aria-hidden="true">
        {BANNER}
      </pre>

      <div className="select-none">
        <p className="text-2xl font-bold">緊急停止中 / ALL MOTION HALTED</p>
        <p className="opacity-90">ロボットの動作を即時停止しました</p>
      </div>

      {/* 解除は明示操作を要求。誤操作防止のため warning 色の確認ボタンにする。 */}
      <TuiButton variant="warning" flat onPress={onRelease} className="text-lg font-bold">
        {"[ ► HOLD TO RELEASE ► ]"}
      </TuiButton>
    </div>
  );
}
