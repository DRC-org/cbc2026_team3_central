import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { SequenceProgress } from "../components/SequenceProgress";
import type { RobotState } from "../hooks/useRobotSocket";

interface DashboardProps {
  states: Record<string, RobotState>;
  connected: boolean;
}

const ROBOTS: { key: string; label: string; path: string }[] = [
  { key: "main_hand", label: "メインハンド", path: "/main-hand" },
  { key: "sub_hand", label: "サブハンド", path: "/sub-hand" },
];

const cardStyle: CSSProperties = {
  backgroundColor: "#0f3460",
  borderRadius: 12,
  padding: 24,
  cursor: "pointer",
  transition: "transform 0.15s",
  flex: 1,
  minWidth: 320,
};

export function Dashboard({ states, connected }: DashboardProps) {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ color: "#eee", marginBottom: 8 }}>
        CBC2026 Team3 Central
      </h1>
      <div style={{ color: connected ? "#16a34a" : "#dc2626", marginBottom: 24 }}>
        ● {connected ? "接続中" : "未接続"}
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {ROBOTS.map(({ key, label, path }) => {
          const state = states[key];
          return (
            <div
              key={key}
              style={cardStyle}
              onClick={() => navigate(path)}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "scale(1.02)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "scale(1)")
              }
            >
              <h2 style={{ color: "#93c5fd", margin: 0 }}>{label}</h2>
              {state ? (
                <>
                  <SequenceProgress
                    sequence={state.sequence}
                    currentStep={state.current_step}
                    stepIndex={state.step_index}
                    totalSteps={state.total_steps}
                    waitingTrigger={state.waiting_trigger}
                  />
                  <div style={{ color: "#aaa", fontSize: 13 }}>
                    モータ数: {Object.keys(state.motors).length}
                  </div>
                </>
              ) : (
                <div style={{ color: "#888", marginTop: 12 }}>
                  データ未受信
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
