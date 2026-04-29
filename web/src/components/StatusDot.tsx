import type { CSSProperties } from "react";

type Tone = "success" | "warning" | "danger" | "neutral" | "accent";

interface StatusDotProps {
  tone: Tone;
  size?: number;
  pulse?: boolean;
  className?: string;
}

const TONE_VAR: Record<Tone, string> = {
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
  neutral: "var(--color-text-subtle)",
  accent: "var(--color-accent)",
};

export function StatusDot({ tone, size = 10, pulse = false, className = "" }: StatusDotProps) {
  const style: CSSProperties = {
    width: size,
    height: size,
    backgroundColor: TONE_VAR[tone],
    boxShadow: `0 0 0 3px ${TONE_VAR[tone]}22`,
  };
  return (
    <span
      aria-hidden="true"
      style={style}
      className={`inline-block rounded-full ${pulse ? "connection-dot-pulse" : ""} ${className}`}
    />
  );
}
