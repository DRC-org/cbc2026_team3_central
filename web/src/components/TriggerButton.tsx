import { useEffect, useState } from "react";
import { Color, TuiButton } from "react-tuicss";

interface TriggerButtonProps {
  waiting: boolean;
  stepIndex: number;
  totalSteps: number;
  onTrigger: () => void;
}

// 実行中表示用の ASCII 回転記号。lucide スピナー撤去の代替（CSS keyframe 不要）。
const SPINNER_FRAMES = ["|", "/", "-", "\\"];

function useAsciiSpinner(active: boolean): string {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(
      () => setFrame((f) => (f + 1) % SPINNER_FRAMES.length),
      120,
    );
    return () => clearInterval(id);
  }, [active]);
  return SPINNER_FRAMES[frame];
}

export function TriggerButton({
  waiting,
  stepIndex,
  totalSteps,
  onTrigger,
}: TriggerButtonProps) {
  // バックエンドは完走時 step_index = total_steps を返す。「最終ステップ実行中」と
  // 「全完走」を分けるため、>= total での判定を採用する
  const isComplete = totalSteps > 0 && stepIndex >= totalSteps && !waiting;
  const spinner = useAsciiSpinner(!waiting && !isComplete);

  if (isComplete) {
    return (
      <TuiButton
        disabled
        color={Color.Green}
        className="flex h-full w-full items-center justify-center gap-3 text-2xl font-black tracking-wide"
        aria-label="シーケンス完走"
      >
        ✓ DONE
      </TuiButton>
    );
  }

  if (waiting) {
    return (
      <TuiButton
        variant="primary"
        flat
        onPress={onTrigger}
        aria-label="次のステップへ進む"
        className="trigger-glow flex h-full w-full items-center justify-center gap-3 text-3xl font-black tracking-wide"
      >
        ► NEXT
      </TuiButton>
    );
  }

  return (
    <TuiButton
      isDisabled
      variant="info"
      flat
      className="flex h-full w-full items-center justify-center gap-3 text-2xl font-black tracking-wide"
      aria-label="シーケンス実行中"
    >
      <span className="tabular-nums">[{spinner}]</span>
      RUNNING
    </TuiButton>
  );
}
