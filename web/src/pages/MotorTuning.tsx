import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MotorStatus } from "../components/MotorStatus";
import type { RobotState } from "../hooks/useRobotSocket";
import type { CSSProperties } from "react";

interface MotorTuningProps {
  states: Record<string, RobotState>;
  send: (data: object) => void;
}

const ROBOT_MAP: Record<string, string> = {
  "main-hand": "main_hand",
  "sub-hand": "sub_hand",
};

const LABEL_MAP: Record<string, string> = {
  "main-hand": "メインハンド",
  "sub-hand": "サブハンド",
};

const PID_PARAMS = ["kp", "ki", "kd"] as const;

const inputStyle: CSSProperties = {
  width: 80,
  padding: "4px 8px",
  backgroundColor: "#1a1a2e",
  color: "#eee",
  border: "1px solid #444",
  borderRadius: 4,
  fontSize: 14,
  fontFamily: "monospace",
};

const sendBtnStyle: CSSProperties = {
  padding: "4px 12px",
  backgroundColor: "#3b82f6",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 13,
};

export function MotorTuning({ states, send }: MotorTuningProps) {
  const { robotName } = useParams<{ robotName: string }>();
  const robotKey = ROBOT_MAP[robotName ?? ""] ?? robotName ?? "";
  const state = states[robotKey];
  const label = LABEL_MAP[robotName ?? ""] ?? robotName;

  const [values, setValues] = useState<Record<string, Record<string, string>>>({});

  const getValue = (motor: string, param: string) =>
    values[motor]?.[param] ?? "";

  const setValue = (motor: string, param: string, val: string) => {
    setValues((prev) => ({
      ...prev,
      [motor]: { ...prev[motor], [param]: val },
    }));
  };

  const handleSend = (motor: string, param: string) => {
    const raw = getValue(motor, param);
    const num = parseFloat(raw);
    if (isNaN(num)) return;
    send({ type: "set_param", motor, key: param, value: num });
  };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Link to={`/${robotName}`} style={{ color: "#93c5fd", textDecoration: "none" }}>
          ← 操作画面に戻る
        </Link>
        <h1 style={{ color: "#eee", margin: 0 }}>{label} モータ調整</h1>
      </div>

      {!state ? (
        <div style={{ color: "#888" }}>データ未受信</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {Object.entries(state.motors).map(([motorName, motorState]) => (
            <div
              key={motorName}
              style={{
                backgroundColor: "#0f3460",
                borderRadius: 12,
                padding: 20,
              }}
            >
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <MotorStatus name={motorName} state={motorState} />

                <div style={{ flex: 1, minWidth: 240 }}>
                  <h3 style={{ color: "#93c5fd", marginTop: 0 }}>
                    パラメータ設定
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {PID_PARAMS.map((param) => (
                      <div
                        key={param}
                        style={{ display: "flex", alignItems: "center", gap: 8 }}
                      >
                        <span style={{ color: "#aaa", width: 28, fontSize: 14 }}>
                          {param}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          style={inputStyle}
                          value={getValue(motorName, param)}
                          onChange={(e) =>
                            setValue(motorName, param, e.target.value)
                          }
                          placeholder="0.00"
                        />
                        <button
                          style={sendBtnStyle}
                          onClick={() => handleSend(motorName, param)}
                        >
                          送信
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
