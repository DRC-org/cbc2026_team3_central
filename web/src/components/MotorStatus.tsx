import type { CSSProperties } from "react";
import type { MotorState } from "../hooks/useRobotSocket";

interface MotorStatusProps {
  name: string;
  state: MotorState;
}

const TEMP_WARNING = 50;
const TEMP_DANGER = 70;

const cardStyle: CSSProperties = {
  backgroundColor: "#16213e",
  borderRadius: 8,
  padding: 12,
  minWidth: 180,
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  color: "#888",
};

const valueStyle: CSSProperties = {
  fontSize: 16,
  color: "#eee",
  fontFamily: "monospace",
};

function tempColor(temp: number): string {
  if (temp >= TEMP_DANGER) return "#dc2626";
  if (temp >= TEMP_WARNING) return "#f59e0b";
  return "#eee";
}

export function MotorStatus({ name, state }: MotorStatusProps) {
  return (
    <div style={cardStyle}>
      <div style={{ fontWeight: 700, color: "#93c5fd", marginBottom: 8 }}>
        {name}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <div style={labelStyle}>位置</div>
          <div style={valueStyle}>{state.pos.toFixed(1)}</div>
        </div>
        <div>
          <div style={labelStyle}>速度</div>
          <div style={valueStyle}>{state.vel.toFixed(1)}</div>
        </div>
        <div>
          <div style={labelStyle}>トルク</div>
          <div style={valueStyle}>{state.torque.toFixed(2)}</div>
        </div>
        <div>
          <div style={labelStyle}>温度</div>
          <div style={{ ...valueStyle, color: tempColor(state.temp) }}>
            {state.temp.toFixed(0)}℃
          </div>
        </div>
      </div>
    </div>
  );
}
