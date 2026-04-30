import { Card } from "@heroui/react";
import { Cpu } from "lucide-react";

import type { MotorState } from "@/hooks/useRobotSocket";

interface MotorStatusProps {
  name: string;
  state: MotorState;
  compact?: boolean;
}

const TEMP_WARNING = 60;
const TEMP_DANGER = 80;

type StatTone = "default" | "warning" | "danger";

const STAT_TONE_CLASS: Record<StatTone, string> = {
  default: "bg-[color:var(--color-surface-2)] text-[color:var(--color-text)]",
  warning:
    "bg-[color:var(--color-warning-soft)] text-[color:oklch(45%_0.16_70)] ring-1 ring-[color:oklch(70%_0.16_70)]/40",
  danger:
    "bg-[color:var(--color-danger-soft)] text-[color:oklch(40%_0.22_25)] ring-1 ring-[color:oklch(58%_0.22_25)]/40",
};

function tempTone(temp: number): StatTone {
  if (temp >= TEMP_DANGER) return "danger";
  if (temp >= TEMP_WARNING) return "warning";
  return "default";
}

interface StatProps {
  label: string;
  value: string;
  unit?: string;
  tone?: StatTone;
}

function Stat({ label, value, unit, tone = "default" }: StatProps) {
  return (
    <div className={`flex flex-col gap-0.5 rounded-[10px] px-3 py-2 ${STAT_TONE_CLASS[tone]}`}>
      <span className="text-[11px] font-medium tracking-wider text-[color:var(--color-text-subtle)] uppercase">
        {label}
      </span>
      <span className="font-mono text-base font-semibold tabular-nums">
        {value}
        {unit ? <span className="ml-1 text-xs font-normal opacity-70">{unit}</span> : null}
      </span>
    </div>
  );
}

interface CompactCellProps {
  label: string;
  value: string;
  unit?: string;
  tone?: StatTone;
}

function CompactCell({ label, value, unit, tone = "default" }: CompactCellProps) {
  const isHighlighted = tone !== "default";
  return (
    <div className="flex min-w-0 flex-col items-end gap-0">
      <span className="text-[9px] font-medium tracking-wider text-[color:var(--color-text-subtle)] uppercase">
        {label}
      </span>
      <span
        className={`font-mono text-xs font-semibold tabular-nums ${
          isHighlighted
            ? tone === "danger"
              ? "text-[color:oklch(40%_0.22_25)]"
              : "text-[color:oklch(45%_0.16_70)]"
            : "text-[color:var(--color-text)]"
        }`}
      >
        {value}
        {unit ? <span className="ml-0.5 text-[9px] font-normal opacity-70">{unit}</span> : null}
      </span>
    </div>
  );
}

export function MotorStatus({ name, state, compact = false }: MotorStatusProps) {
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-[10px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-2.5 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]">
            <Cpu size={12} strokeWidth={2.5} />
          </span>
          <span className="truncate font-mono text-xs font-bold tracking-tight text-[color:var(--color-text)]">
            {name}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <CompactCell label="位置" value={state.pos.toFixed(0)} />
          <CompactCell label="速度" value={state.vel.toFixed(0)} />
          <CompactCell
            label="温度"
            value={state.temp.toFixed(0)}
            unit="℃"
            tone={tempTone(state.temp)}
          />
        </div>
      </div>
    );
  }

  return (
    <Card variant="default" className="gap-3">
      <Card.Header className="flex flex-row items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]">
          <Cpu size={14} strokeWidth={2.5} />
        </span>
        <Card.Title className="font-mono text-sm font-bold tracking-tight">{name}</Card.Title>
      </Card.Header>
      <Card.Content className="grid grid-cols-2 gap-2">
        <Stat label="位置" value={state.pos.toFixed(1)} />
        <Stat label="速度" value={state.vel.toFixed(1)} />
        <Stat label="トルク" value={state.torque.toFixed(2)} />
        <Stat label="温度" value={state.temp.toFixed(0)} unit="℃" tone={tempTone(state.temp)} />
      </Card.Content>
    </Card>
  );
}
