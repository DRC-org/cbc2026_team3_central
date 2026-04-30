import { CheckCircle2, ChevronRight, Loader2 } from "lucide-react";

import { Icon } from "@/components/Icon";

interface TriggerButtonProps {
  waiting: boolean;
  stepIndex: number;
  totalSteps: number;
  onTrigger: () => void;
}

export function TriggerButton({ waiting, stepIndex, totalSteps, onTrigger }: TriggerButtonProps) {
  const isComplete = totalSteps > 0 && stepIndex + 1 >= totalSteps && !waiting;

  const baseClass =
    "flex w-full items-center justify-center gap-4 rounded-[20px] px-8 text-3xl font-black tracking-wide shadow-[var(--shadow-card)] transition";

  if (isComplete) {
    return (
      <button
        type="button"
        disabled
        className={`${baseClass} min-h-[200px] cursor-default border border-[color:var(--color-success)]/30 bg-[color:var(--color-success-soft)] text-[color:oklch(35%_0.16_150)]`}
      >
        <Icon icon={CheckCircle2} size={48} strokeWidth={2.5} />
        <span>完了</span>
      </button>
    );
  }

  if (waiting) {
    return (
      <button
        type="button"
        onClick={onTrigger}
        aria-label="次のステップへ進む"
        className={`${baseClass} min-h-[220px] cursor-pointer border-2 border-[color:var(--color-accent)] bg-gradient-to-br from-[color:var(--color-accent)] to-[oklch(48%_0.24_295)] text-white hover:scale-[1.005] hover:shadow-[var(--shadow-elev)] focus-visible:ring-4 focus-visible:ring-[color:var(--color-accent)]/40 focus-visible:outline-none active:translate-y-px active:scale-100`}
      >
        <span className="text-5xl">次へ進む</span>
        <Icon icon={ChevronRight} size={56} strokeWidth={2.5} />
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled
      className={`${baseClass} min-h-[200px] cursor-not-allowed border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] text-[color:var(--color-text-muted)]`}
    >
      <Icon icon={Loader2} size={40} strokeWidth={2.5} className="animate-spin" />
      <span>実行中</span>
    </button>
  );
}
