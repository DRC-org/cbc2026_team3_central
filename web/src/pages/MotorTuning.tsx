import { useState } from "react";

import { MotorStatus } from "@/components/MotorStatus";
import { TuiButton, cx } from "@/components/tui";
import { useRobot } from "@/context/RobotContext";

const PID_PARAMS = [
  { key: "kp", label: "Kp", max: 10 },
  { key: "ki", label: "Ki", max: 5 },
  { key: "kd", label: "Kd", max: 5 },
] as const;

const ROBOTS = [
  { key: "main_hand", label: "MAIN HAND" },
  { key: "sub_hand", label: "SUB HAND" },
] as const;

const STEP = 0.01;

interface PidRowProps {
  label: string;
  max: number;
  value: number;
  onChange: (val: number) => void;
  onSend: () => void;
}

// PID 1 項目の行: ◄ 微減 / TUI レンジ / ► 微増 / 数値表示 / SEND。
// 送信は明示ボタンのみ（スライダー操作だけでは set_param を飛ばさない）。
function PidRow({ label, max, value, onChange, onSend }: PidRowProps) {
  // クランプ後に STEP 単位の浮動小数誤差を丸める。
  const clamp = (val: number) => {
    const next = Math.min(max, Math.max(0, val));
    return Math.round(next / STEP) * STEP;
  };
  const fillPercent = `${(value / max) * 100}%`;

  return (
    <div className="flex items-center gap-2 px-1 py-0.5">
      <span className="w-7 shrink-0 font-bold">{label}</span>
      <TuiButton
        variant="secondary"
        flat
        aria-label={`${label} を減らす`}
        onPress={() => onChange(clamp(value - STEP))}
        className="shrink-0 px-2 py-0"
      >
        ◄
      </TuiButton>
      <input
        type="range"
        className="tui-range flex-1"
        aria-label={label}
        min={0}
        max={max}
        step={STEP}
        value={value}
        // 塗り境界をインライン変数で渡す（CSS グラデの分岐点）。
        style={{ "--tui-range-fill": fillPercent } as React.CSSProperties}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
      />
      <TuiButton
        variant="secondary"
        flat
        aria-label={`${label} を増やす`}
        onPress={() => onChange(clamp(value + STEP))}
        className="shrink-0 px-2 py-0"
      >
        ►
      </TuiButton>
      <span className="w-14 shrink-0 text-right font-bold tabular-nums">{value.toFixed(2)}</span>
      <TuiButton
        variant="primary"
        flat
        aria-label={`${label} を送信`}
        onPress={onSend}
        className="shrink-0 px-2 py-0 font-bold"
      >
        ► SEND
      </TuiButton>
    </div>
  );
}

export function MotorTuning() {
  const { states, send } = useRobot();
  const [values, setValues] = useState<Record<string, Record<string, number>>>({});

  const getValue = (motor: string, param: string) => values[motor]?.[param] ?? 0;

  const setValue = (motor: string, param: string, val: number) => {
    setValues((prev) => ({
      ...prev,
      [motor]: { ...prev[motor], [param]: val },
    }));
  };

  const handleSend = (motor: string, param: string) => {
    send({ type: "set_param", motor, key: param, value: getValue(motor, param) });
  };

  return (
    <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 md:grid-cols-2">
      {ROBOTS.map(({ key, label }) => {
        const state = states[key];
        const motors = state ? Object.entries(state.motors) : [];
        return (
          <div key={key} className="tui-window tui-fill overflow-hidden">
            <fieldset className="tui-fieldset tui-fill">
              <legend>{label}</legend>

              {!state ? (
                <p className="px-2 py-4 opacity-80">データ未受信 — 接続待機中...</p>
              ) : motors.length === 0 ? (
                <p className="px-2 py-4 opacity-80">モータ情報なし</p>
              ) : (
                // モータ数が増えても枠内のみスクロールさせ全体スクロールは禁止する。
                <div className="tui-scroll tui-col flex-1 gap-3 pr-1">
                  {motors.map(([motorName, motorState]) => (
                    <fieldset key={motorName} className={cx("tui-fieldset", "mb-0")}>
                      <legend>{motorName}</legend>
                      <div className="mb-2">
                        <MotorStatus name={motorName} state={motorState} compact />
                      </div>
                      <div className="border-t border-white/30 pt-2">
                        {PID_PARAMS.map(({ key: paramKey, label: paramLabel, max }) => (
                          <PidRow
                            key={paramKey}
                            label={paramLabel}
                            max={max}
                            value={getValue(motorName, paramKey)}
                            onChange={(val) => setValue(motorName, paramKey, val)}
                            onSend={() => handleSend(motorName, paramKey)}
                          />
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>
              )}
            </fieldset>
          </div>
        );
      })}
    </main>
  );
}
