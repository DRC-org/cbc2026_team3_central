import { useParams, Link } from "react-router-dom";
import { SequenceProgress } from "../components/SequenceProgress";
import { TriggerButton } from "../components/TriggerButton";
import { MotorStatus } from "../components/MotorStatus";
import type { RobotState } from "../hooks/useRobotSocket";

interface RobotControlProps {
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

export function RobotControl({ states, send }: RobotControlProps) {
  const { robotName } = useParams<{ robotName: string }>();
  const robotKey = ROBOT_MAP[robotName ?? ""] ?? robotName ?? "";
  const state = states[robotKey];
  const label = LABEL_MAP[robotName ?? ""] ?? robotName;

  const handleTrigger = () => {
    send({ type: "trigger", robot: robotKey });
  };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Link to="/" style={{ color: "#93c5fd", textDecoration: "none" }}>
          ← 戻る
        </Link>
        <h1 style={{ color: "#eee", margin: 0 }}>{label}</h1>
        <Link
          to={`/${robotName}/motors`}
          style={{ color: "#93c5fd", textDecoration: "none", marginLeft: "auto" }}
        >
          モータ調整 →
        </Link>
      </div>

      {!state ? (
        <div style={{ color: "#888" }}>データ未受信</div>
      ) : (
        <>
          <SequenceProgress
            sequence={state.sequence}
            currentStep={state.current_step}
            stepIndex={state.step_index}
            totalSteps={state.total_steps}
            waitingTrigger={state.waiting_trigger}
          />

          <div style={{ marginBottom: 24 }}>
            <TriggerButton
              waiting={state.waiting_trigger}
              onTrigger={handleTrigger}
            />
          </div>

          <h2 style={{ color: "#aaa", fontSize: 16, marginBottom: 12 }}>
            モータ状態
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            {Object.entries(state.motors).map(([name, motor]) => (
              <MotorStatus key={name} name={name} state={motor} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
