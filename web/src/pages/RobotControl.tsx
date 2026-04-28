import { useParams, Link as RouterLink } from "react-router-dom";
import { Button } from "@heroui/react";
import { useRobot } from "../context/RobotContext";
import { SequenceProgress } from "../components/SequenceProgress";
import { TriggerButton } from "../components/TriggerButton";
import { MotorStatus } from "../components/MotorStatus";

const ROBOT_MAP: Record<string, string> = {
  "main-hand": "main_hand",
  "sub-hand": "sub_hand",
};

const LABEL_MAP: Record<string, string> = {
  "main-hand": "メインハンド",
  "sub-hand": "サブハンド",
};

export function RobotControl() {
  const { states, send } = useRobot();
  const { robotName } = useParams<{ robotName: string }>();
  const robotKey = ROBOT_MAP[robotName ?? ""] ?? robotName ?? "";
  const state = states[robotKey];
  const label = LABEL_MAP[robotName ?? ""] ?? robotName;

  const handleTrigger = () => {
    send({ type: "trigger", robot: robotKey });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <RouterLink to="/">
          <Button variant="ghost" size="sm">
            ← 戻る
          </Button>
        </RouterLink>
        <h1 className="text-2xl font-bold text-gray-900">{label}</h1>
        <RouterLink to={`/${robotName}/motors`} className="ml-auto">
          <Button variant="ghost" size="sm">
            モータ調整 →
          </Button>
        </RouterLink>
      </div>

      {!state ? (
        <p className="text-gray-400">データ未受信</p>
      ) : (
        <>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
            <SequenceProgress
              sequence={state.sequence}
              currentStep={state.current_step}
              stepIndex={state.step_index}
              totalSteps={state.total_steps}
              waitingTrigger={state.waiting_trigger}
            />
          </div>

          <div className="flex justify-center py-4">
            <TriggerButton
              waiting={state.waiting_trigger}
              onTrigger={handleTrigger}
            />
          </div>

          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-700">
              モータ状態
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(state.motors).map(([name, motor]) => (
                <MotorStatus key={name} name={name} state={motor} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
