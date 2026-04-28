interface TriggerButtonProps {
  waiting: boolean;
  stepIndex: number;
  totalSteps: number;
  onTrigger: () => void;
}

export function TriggerButton({ waiting, stepIndex, totalSteps, onTrigger }: TriggerButtonProps) {
  const isComplete = totalSteps > 0 && stepIndex + 1 >= totalSteps && !waiting;

  let bgClass: string;
  let label: string;
  let disabled: boolean;

  if (isComplete) {
    bgClass = "bg-green-500 border-green-700 text-white";
    label = "完了 ✓";
    disabled = true;
  } else if (waiting) {
    bgClass = "bg-blue-600 border-blue-800 text-white hover:bg-blue-700 active:bg-blue-800 cursor-pointer";
    label = "次へ進む ▶";
    disabled = false;
  } else {
    bgClass = "bg-gray-300 border-gray-400 text-gray-500";
    label = "実行中...";
    disabled = true;
  }

  return (
    <button
      onClick={disabled ? undefined : onTrigger}
      disabled={disabled}
      className={`min-h-[200px] w-full rounded-2xl border-4 text-4xl font-black tracking-wide shadow-lg transition-colors ${bgClass}`}
    >
      {label}
    </button>
  );
}
