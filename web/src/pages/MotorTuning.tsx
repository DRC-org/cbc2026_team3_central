import { Skeleton, Slider } from "@heroui/react";
import { Send, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { Icon } from "../components/Icon";
import { MotorStatus } from "../components/MotorStatus";
import { useRobot } from "../context/RobotContext";

const PID_PARAMS = [
  { key: "kp", label: "Kp", max: 10 },
  { key: "ki", label: "Ki", max: 5 },
  { key: "kd", label: "Kd", max: 5 },
] as const;

const ROBOTS = [
  { key: "main_hand", label: "メインハンド" },
  { key: "sub_hand", label: "サブハンド" },
] as const;

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
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-6 md:px-8 md:py-10">
      {ROBOTS.map(({ key, label }) => {
        const state = states[key];
        return (
          <section key={key} className="flex flex-col gap-4">
            <h2 className="flex items-center gap-2 text-2xl font-extrabold text-[color:var(--color-text)]">
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]">
                <Icon icon={SlidersHorizontal} size={18} strokeWidth={2.4} />
              </span>
              {label}
            </h2>

            {!state ? (
              <div className="rounded-[var(--radius-card)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6">
                <p className="mb-3 text-sm font-medium text-[color:var(--color-text-muted)]">
                  データ未受信
                </p>
                <Skeleton className="h-6 w-1/2 rounded" />
              </div>
            ) : Object.keys(state.motors).length === 0 ? (
              <p className="rounded-[var(--radius-card)] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-6 text-sm text-[color:var(--color-text-muted)]">
                モータ情報なし
              </p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {Object.entries(state.motors).map(([motorName, motorState]) => (
                  <div
                    key={motorName}
                    className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-card)]"
                  >
                    <MotorStatus name={motorName} state={motorState} />
                    <div className="flex flex-col gap-3 border-t border-[color:var(--color-border)] pt-4">
                      <h3 className="text-xs font-bold tracking-wider text-[color:var(--color-text-subtle)] uppercase">
                        パラメータ設定
                      </h3>
                      {PID_PARAMS.map(({ key: paramKey, label: paramLabel, max }) => (
                        <div key={paramKey} className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-[color:var(--color-text)]">
                              {paramLabel}
                            </span>
                            <span className="font-mono text-sm text-[color:var(--color-text-muted)] tabular-nums">
                              {getValue(motorName, paramKey).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Slider
                              aria-label={paramLabel}
                              minValue={0}
                              maxValue={max}
                              step={0.01}
                              value={getValue(motorName, paramKey)}
                              onChange={(v) => setValue(motorName, paramKey, v as number)}
                              className="flex-1"
                            >
                              <Slider.Track>
                                <Slider.Fill />
                                <Slider.Thumb />
                              </Slider.Track>
                            </Slider>
                            <button
                              type="button"
                              onClick={() => handleSend(motorName, paramKey)}
                              className="flex h-9 items-center gap-1.5 rounded-[10px] bg-[color:var(--color-accent)] px-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-accent-hover)] focus-visible:ring-4 focus-visible:ring-[color:var(--color-accent)]/30 focus-visible:outline-none active:translate-y-px"
                            >
                              <Icon icon={Send} size={14} strokeWidth={2.4} />
                              送信
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </main>
  );
}
