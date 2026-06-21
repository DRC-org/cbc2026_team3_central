import { useEffect, useState } from "react";
import { Color, TuiButton } from "react-tuicss";

import { HealthIndicator } from "@/components/HealthIndicator";
import { MotorCheckButton } from "@/components/MotorCheckButton";
import { MotorCheckPanel } from "@/components/MotorCheckPanel";
import { MotorSummary } from "@/components/MotorSummary";
import { SequenceProgress } from "@/components/SequenceProgress";
import { useRobot } from "@/context/RobotContext";
import type { HealthChangeEvent } from "@/hooks/useRobotSocket";

const ROBOTS = [
  { key: "main_hand", label: "MAIN HAND", path: "/main-hand" },
  { key: "sub_hand", label: "SUB HAND", path: "/sub-hand" },
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
            <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>
              {toast.event.robot}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
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
                  fontSize: "0.75rem",
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
              fontWeight: "bold",
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
  const [panelOpen, setPanelOpen] = useState<Record<string, boolean>>({});

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
    <main
      style={{
        display: "grid",
        minHeight: 0,
        flex: 1,
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 12,
        overflow: "hidden",
        padding: 12,
      }}
    >
      {ROBOTS.map(({ key, label }) => {
        const state = states[key];
        return (
          <div
            key={key}
            className="tui-window"
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minHeight: 0,
              height: "100%",
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
              <legend>{label}</legend>

              {state ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexShrink: 0,
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <span
                      className="success-text"
                      style={{ fontSize: "0.75rem", fontWeight: "bold" }}
                    >
                      ● 受信中
                    </span>
                  </div>

                  <div style={{ flexShrink: 0 }}>
                    <SequenceProgress
                      sequence={state.sequence}
                      currentStep={state.current_step}
                      stepIndex={state.step_index}
                      totalSteps={state.total_steps}
                      waitingTrigger={state.waiting_trigger}
                      large
                    />
                  </div>

                  <div style={{ flexShrink: 0 }}>
                    <HealthIndicator variant="card" health={state.health} />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexShrink: 0,
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <MotorCheckButton
                      robotName={key}
                      onPanelOpen={() =>
                        setPanelOpen((prev) => ({ ...prev, [key]: true }))
                      }
                    />
                    <TuiButton
                      color={Color.Yellow}
                      onClick={() =>
                        setPanelOpen((prev) => ({ ...prev, [key]: true }))
                      }
                    >
                      ▤ 結果を表示
                    </TuiButton>
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
                </div>
              ) : (
                <p style={{ padding: "16px 8px", opacity: 0.8 }}>
                  データ未受信 — 接続待機中...
                </p>
              )}
            </fieldset>
          </div>
        );
      })}

      {ROBOTS.map(({ key }) => (
        <MotorCheckPanel
          key={key}
          robotName={key}
          isOpen={Boolean(panelOpen[key])}
          onOpenChange={(open) =>
            setPanelOpen((prev) => ({ ...prev, [key]: open }))
          }
        />
      ))}

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
    </main>
  );
}
