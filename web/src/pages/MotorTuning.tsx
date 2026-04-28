import { useState } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import { Button, Card, Slider } from "@heroui/react";
import { useRobot } from "../context/RobotContext";
import { MotorStatus } from "../components/MotorStatus";

const ROBOT_MAP: Record<string, string> = {
  "main-hand": "main_hand",
  "sub-hand": "sub_hand",
};

const LABEL_MAP: Record<string, string> = {
  "main-hand": "メインハンド",
  "sub-hand": "サブハンド",
};

const PID_PARAMS = [
  { key: "kp", label: "Kp", max: 10 },
  { key: "ki", label: "Ki", max: 5 },
  { key: "kd", label: "Kd", max: 5 },
] as const;

export function MotorTuning() {
  const { states, send } = useRobot();
  const { robotName } = useParams<{ robotName: string }>();
  const robotKey = ROBOT_MAP[robotName ?? ""] ?? robotName ?? "";
  const state = states[robotKey];
  const label = LABEL_MAP[robotName ?? ""] ?? robotName;

  const [values, setValues] = useState<Record<string, Record<string, number>>>(
    {}
  );

  const getValue = (motor: string, param: string) =>
    values[motor]?.[param] ?? 0;

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
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <RouterLink to={`/${robotName}`}>
          <Button variant="ghost" size="sm">
            ← 操作画面に戻る
          </Button>
        </RouterLink>
        <h1 className="text-2xl font-bold text-gray-900">
          {label} モータ調整
        </h1>
      </div>

      {!state ? (
        <p className="text-gray-400">データ未受信</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(state.motors).map(([motorName, motorState]) => (
            <Card key={motorName} className="p-6">
              <div className="flex flex-wrap gap-6">
                <div className="min-w-[200px]">
                  <MotorStatus name={motorName} state={motorState} />
                </div>

                <div className="min-w-[280px] flex-1 space-y-4">
                  <h3 className="font-semibold text-gray-700">
                    パラメータ設定
                  </h3>
                  {PID_PARAMS.map(({ key, label: paramLabel, max }) => (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">
                          {paramLabel}
                        </span>
                        <span className="font-mono text-sm text-gray-800">
                          {getValue(motorName, key).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Slider
                          aria-label={paramLabel}
                          minValue={0}
                          maxValue={max}
                          step={0.01}
                          value={getValue(motorName, key)}
                          onChange={(v) =>
                            setValue(motorName, key, v as number)
                          }
                          className="flex-1"
                        >
                          <Slider.Track>
                            <Slider.Fill />
                            <Slider.Thumb />
                          </Slider.Track>
                        </Slider>
                        <Button
                          size="sm"
                          variant="primary"
                          onPress={() => handleSend(motorName, key)}
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
    </div>
  );
}
