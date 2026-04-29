import type { ReactNode } from "react";

type Tone = "default" | "warning" | "danger" | "success";

interface StatPillProps {
  label: string;
  value: ReactNode;
  unit?: string;
  tone?: Tone;
  monospace?: boolean;
}

const TONE_CLASS: Record<Tone, string> = {
  default: "text-[color:var(--color-text)] bg-[color:var(--color-surface-2)]",
  warning:
    "text-[color:oklch(45%_0.16_70)] bg-[color:var(--color-warning-soft)] ring-1 ring-[color:oklch(70%_0.16_70)]/40",
  danger:
    "text-[color:oklch(40%_0.22_25)] bg-[color:var(--color-danger-soft)] ring-1 ring-[color:oklch(58%_0.22_25)]/40",
  success:
    "text-[color:oklch(35%_0.16_150)] bg-[color:var(--color-success-soft)] ring-1 ring-[color:oklch(60%_0.16_150)]/30",
};

export function StatPill({
  label,
  value,
  unit,
  tone = "default",
  monospace = true,
}: StatPillProps) {
  return (
    <div className={`flex flex-col gap-0.5 rounded-[10px] px-3 py-2 ${TONE_CLASS[tone]}`}>
      <span className="text-[11px] font-medium tracking-wider text-[color:var(--color-text-subtle)] uppercase">
        {label}
      </span>
      <span className={`text-base font-semibold tabular-nums ${monospace ? "font-mono" : ""}`}>
        {value}
        {unit ? <span className="ml-1 text-xs font-normal opacity-70">{unit}</span> : null}
      </span>
    </div>
  );
}
