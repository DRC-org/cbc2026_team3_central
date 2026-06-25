import type { MotorState } from "@/hooks/useRobotSocket";

interface MotorStatusProps {
  name: string;
  state: MotorState;
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
      }}
    >
      <span style={{ opacity: 0.6 }}>{label}</span>
      <span className={STAT_TONE_TEXT[tone]}>
        {value}
        {unit ? (
          <span
            style={{
              marginLeft: "0.125rem",
              opacity: 0.7,
            }}
          >
            {unit}
          </span>
        ) : null}
      </span>
    </div>
  );
}

export function MotorStatus({ name, state }: MotorStatusProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.5rem",
        padding: "0.25rem",
      }}
    >
      <span
        style={{
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </span>
      <div
        style={{
          display: "flex",
          flexShrink: 0,
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <Cell label="POS" value={state.pos.toFixed(1)} />
        <Cell label="VEL" value={state.vel.toFixed(1)} />
        <Cell label="TRQ" value={state.torque.toFixed(1)} />
        <Cell
          label="TMP"
          value={state.temp.toFixed(1)}
          unit="℃"
          tone={tempTone(state.temp)}
        />
      </div>
    </div>
  );
}
