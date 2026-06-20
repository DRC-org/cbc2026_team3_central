import { cx } from "@/components/tui";
import type { MotorState } from "@/hooks/useRobotSocket";

interface MotorStatusProps {
  name: string;
  state: MotorState;
  compact?: boolean;
}

const TEMP_WARNING = 60;
const TEMP_DANGER = 80;

type StatTone = "default" | "warning" | "danger";

// 温度帯に応じた TuiCss セマンティック text クラス。default は地の文字色のまま。
const STAT_TONE_TEXT: Record<StatTone, string> = {
  default: "",
  warning: "warning-text",
  danger: "danger-text",
};

function tempTone(temp: number): StatTone {
  if (temp >= TEMP_DANGER) return "danger";
  if (temp >= TEMP_WARNING) return "warning";
  return "default";
}

interface CellProps {
  label: string;
  value: string;
  unit?: string;
  tone?: StatTone;
}

function Cell({ label, value, unit, tone = "default" }: CellProps) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-xs opacity-60">{label}</span>
      <span className={cx("tabular-nums font-bold", STAT_TONE_TEXT[tone])}>
        {value}
        {unit ? <span className="ml-0.5 text-xs opacity-70">{unit}</span> : null}
      </span>
    </div>
  );
}

export function MotorStatus({ name, state, compact = false }: MotorStatusProps) {
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2 px-1 py-1">
        <span className="min-w-0 truncate font-bold">{name}</span>
        <div className="flex shrink-0 items-center gap-3">
          <Cell label="POS" value={state.pos.toFixed(0)} />
          <Cell label="VEL" value={state.vel.toFixed(0)} />
          <Cell
            label="TMP"
            value={state.temp.toFixed(0)}
            unit="℃"
            tone={tempTone(state.temp)}
          />
        </div>
      </div>
    );
  }

  return (
    <fieldset className="tui-fieldset">
      <legend>{name}</legend>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-1 py-1">
        <Cell label="POS" value={state.pos.toFixed(1)} />
        <Cell label="VEL" value={state.vel.toFixed(1)} />
        <Cell label="TRQ" value={state.torque.toFixed(2)} />
        <Cell label="TMP" value={state.temp.toFixed(0)} unit="℃" tone={tempTone(state.temp)} />
      </div>
    </fieldset>
  );
}
