import { Cpu } from "lucide-react";

import type { MotorState } from "../hooks/useRobotSocket";
import { Icon } from "./Icon";
import { StatPill } from "./StatPill";

interface MotorStatusProps {
  name: string;
  state: MotorState;
}

const TEMP_WARNING = 60;
const TEMP_DANGER = 80;

function tempTone(temp: number): "default" | "warning" | "danger" {
  if (temp >= TEMP_DANGER) return "danger";
  if (temp >= TEMP_WARNING) return "warning";
  return "default";
}

export function MotorStatus({ name, state }: MotorStatusProps) {
  return (
    <article className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
      <header className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]">
          <Icon icon={Cpu} size={14} strokeWidth={2.5} />
        </span>
        <h3 className="font-mono text-sm font-bold tracking-tight text-[color:var(--color-text)]">
          {name}
        </h3>
      </header>
      <div className="grid grid-cols-2 gap-2">
        <StatPill label="位置" value={state.pos.toFixed(1)} />
        <StatPill label="速度" value={state.vel.toFixed(1)} />
        <StatPill label="トルク" value={state.torque.toFixed(2)} />
        <StatPill label="温度" value={state.temp.toFixed(0)} unit="℃" tone={tempTone(state.temp)} />
      </div>
    </article>
  );
}
