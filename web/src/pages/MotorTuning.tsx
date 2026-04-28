import { useState } from "react";
import { Button, Card, Skeleton, Slider } from "@heroui/react";
import { useRobot } from "../context/RobotContext";
import { AppHeader } from "../components/AppHeader";
import { MotorStatus } from "../components/MotorStatus";
import { EStopOverlay } from "../components/EStopOverlay";

interface MotorTuningProps {
  eStopActive: boolean;
  onEStop: () => void;
  onEStopRelease: () => void;
}

const PID_PARAMS = [
  { key: "kp", label: "Kp", max: 10 },
  { key: "ki", label: "Ki", max: 5 },
  { key: "kd", label: "Kd", max: 5 },
] as const;

const ROBOTS = [
  { key: "main_hand", label: "メインハンド" },
  { key: "sub_hand", label: "サブハンド" },
] as const;

export function MotorTuning({ eStopActive, onEStop, onEStopRelease }: MotorTuningProps) {
  const { states, connected, send } = useRobot();

  const [values, setValues] = useState<Record<string, Record<string, number>>>({});

  const getValue = (motor: string, param: string) => values[motor]?.[param] ?? 0;

  const setValue = (motor: string, param: string, val: number) => {
    setValues((prev) => ({
      ...prev,
      [motor]: { ...prev[motor], [param]: val },
    }));
  };

  const handleSend = (motor: string, param: string) => {
    const val = getValue(motor, param);
    send({ type: "set_param", motor, key: param, value: val });
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <AppHeader title="モータ調整" connected={connected} onEStop={onEStop} />

      <main className="mx-auto w-full max-w-5xl space-y-10 px-6 py-6">
        {ROBOTS.map(({ key, label }) => {
          const state = states[key];
          return (
            <section key={key}>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">{label}</h2>
              {!state ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-1/2 rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                  <p className="text-lg text-gray-400">データ未受信</p>
                </div>
              ) : Object.keys(state.motors).length === 0 ? (
                <p className="text-lg text-gray-400">モータ情報なし</p>
              ) : (
                <div className="space-y-5">
                  {Object.entries(state.motors).map(([motorName, motorState]) => (
                    <Card key={motorName} className="p-5">
                      <div className="flex flex-wrap gap-6">
                        <div className="min-w-[220px]">
                          <MotorStatus name={motorName} state={motorState} />
                        </div>

                        <div className="min-w-[300px] flex-1 space-y-4">
                          <h3 className="text-lg font-semibold text-gray-700">パラメータ設定</h3>
                          {PID_PARAMS.map(({ key: paramKey, label: paramLabel, max }) => (
                            <div key={paramKey} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-base font-medium text-gray-600">
                                  {paramLabel}
                                </span>
                                <span className="font-mono text-base text-gray-800">
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
                                <Button
                                  size="md"
                                  variant="primary"
                                  onPress={() => handleSend(motorName, paramKey)}
                                >
                                  送信
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </main>

      <EStopOverlay active={eStopActive} onRelease={onEStopRelease} />
    </div>
  );
}
