import { useEffect, useState } from "react";

import { HealthIndicator } from "@/components/HealthIndicator";
import { MotorSummary } from "@/components/MotorSummary";
import { SequenceProgress } from "@/components/SequenceProgress";
import { useRobot } from "@/context/RobotContext";
import type { HealthChangeEvent } from "@/hooks/useRobotSocket";

const ROBOTS = [
  { key: "main_hand", label: "Main Hand" },
  { key: "sub_hand", label: "Sub Hand" },
] as const;

const TOAST_VISIBLE_MS = 5000;

interface ToastState {
  event: HealthChangeEvent;
  id: number;
}

// TUI 風通知: 等幅枠 + [!]/[X]。表示ロジック自体は従来どおり health_change を契機にする。
function HealthToast({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: () => void;
}) {
  const isCritical = toast.event.level === "critical";
  const textClass = isCritical ? "danger-text" : "warning-text";
  return (
    <div
      className="tui-window"
      style={{
        pointerEvents: "auto",
        width: "20rem",
        maxWidth: "calc(100vw - 2rem)",
      }}
    >
      <fieldset className="tui-fieldset">
        <legend>
          <span className={textClass}>
            [!] {toast.event.level.toUpperCase()}
          </span>
        </legend>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ opacity: 0.8 }}>{toast.event.robot}</div>
            <div
              style={{
                opacity: 0.8,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {toast.event.target}
            </div>
            <div className={textClass}>
              {toast.event.from} → {toast.event.to}
            </div>
            {toast.event.message ? (
              <div
                style={{
                  marginTop: 4,
                  opacity: 0.8,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {toast.event.message}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="通知を閉じる"
            style={{
              flexShrink: 0,
              opacity: 0.8,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "inherit",
            }}
          >
            [X]
          </button>
        </div>
      </fieldset>
    </div>
  );
}

export function Dashboard() {
  const { states, healthEvents } = useRobot();
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const latest = healthEvents[0];
    if (!latest) return;
    if (latest.level === "info") return;
    setToast({ event: latest, id: latest.receivedAt });
    const timer = setTimeout(() => {
      setToast((prev) => (prev && prev.id === latest.receivedAt ? null : prev));
    }, TOAST_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [healthEvents]);

  return (
    <>
      <table
        className="tui-table-grid"
        style={{
          tableLayout: "fixed",
          width: "calc(100% - 1rem)",
          margin: "0.5rem",
        }}
      >
        <tbody>
          <tr>
            {ROBOTS.map(({ key, label }) => {
              const state = states[key];
              return (
                <td key={key} width="50%" className="blue-168-text">
                  <span className="tui-shadow blue-168 white-168-text">
                    {label}
                  </span>
                  <br />
                  <br />
                  {state ? (
                    <>
                      <div style={{ flexShrink: 0 }}>
                        <SequenceProgress
                          sequence={state.sequence}
                          currentStep={state.current_step}
                          stepIndex={state.step_index}
                          totalSteps={state.total_steps}
                          waitingTrigger={state.waiting_trigger}
                        />
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        <HealthIndicator variant="card" health={state.health} />
                      </div>

                      <div
                        className="tui-window"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          flex: 1,
                          minHeight: 0,
                          overflow: "hidden",
                        }}
                      >
                        <fieldset
                          className="tui-fieldset"
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            flex: 1,
                            minHeight: 0,
                          }}
                        >
                          <legend>MOTORS</legend>
                          <MotorSummary motors={state.motors} />
                        </fieldset>
                      </div>
                    </>
                  ) : (
                    <>
                      <span style={{ opacity: 0.8 }}>Data not received</span>
                      <div className="tui-progress-bar inline-block valign-middle">
                        <span className="tui-indeterminate"></span>
                      </div>
                    </>
                  )}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>

      <div
        style={{
          position: "fixed",
          right: "1rem",
          bottom: "3rem",
          zIndex: 50,
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {toast ? (
          <HealthToast toast={toast} onDismiss={() => setToast(null)} />
        ) : null}
      </div>
    </>
  );
}
