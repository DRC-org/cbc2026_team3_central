import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";

import { HealthIndicator } from "@/components/HealthIndicator";
import { MotorCheckButton } from "@/components/MotorCheckButton";
import { MotorCheckPanel } from "@/components/MotorCheckPanel";
import { MotorSummary } from "@/components/MotorSummary";
import { SequenceProgress } from "@/components/SequenceProgress";
import { TuiButton, cx } from "@/components/tui";
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
function HealthToast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  const isCritical = toast.event.level === "critical";
  const textClass = isCritical ? "danger-text" : "warning-text";
  return (
    <div className="tui-window pointer-events-auto w-80 max-w-[calc(100vw-2rem)]">
      <fieldset className="tui-fieldset">
        <legend>
          <span className={cx("font-bold", textClass)}>
            [!] {toast.event.level.toUpperCase()}
          </span>
        </legend>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs opacity-80">{toast.event.robot}</div>
            <div className="truncate text-xs opacity-80">{toast.event.target}</div>
            <div className={cx("mt-1 font-bold", textClass)}>
              {toast.event.from} → {toast.event.to}
            </div>
            {toast.event.message ? (
              <div className="mt-1 truncate text-xs opacity-80">{toast.event.message}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="通知を閉じる"
            className="shrink-0 font-bold opacity-80 hover:opacity-100"
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit" }}
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
    <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 md:grid-cols-2">
      {ROBOTS.map(({ key, label, path }) => {
        const state = states[key];
        return (
          <div key={key} className="tui-window tui-fill overflow-hidden">
            <fieldset className="tui-fieldset tui-fill">
              <legend>{label}</legend>

              {state ? (
                <div className="tui-col gap-3 overflow-hidden">
                  <div className="flex shrink-0 items-center justify-between gap-3">
                    <span className="success-text text-xs font-bold">● 受信中</span>
                    <RouterLink to={path} className="info-text font-bold no-underline">
                      &gt; OPEN CONTROL
                    </RouterLink>
                  </div>

                  <div className="shrink-0">
                    <SequenceProgress
                      sequence={state.sequence}
                      currentStep={state.current_step}
                      stepIndex={state.step_index}
                      totalSteps={state.total_steps}
                      waitingTrigger={state.waiting_trigger}
                      large
                    />
                  </div>

                  <div className="shrink-0">
                    <HealthIndicator variant="card" health={state.health} />
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <MotorCheckButton
                      robotName={key}
                      onPanelOpen={() => setPanelOpen((prev) => ({ ...prev, [key]: true }))}
                    />
                    <TuiButton
                      variant="secondary"
                      flat
                      onPress={() => setPanelOpen((prev) => ({ ...prev, [key]: true }))}
                    >
                      ▤ 結果を表示
                    </TuiButton>
                  </div>

                  <div className="tui-window tui-fill flex-1 overflow-hidden">
                    <fieldset className="tui-fieldset tui-fill">
                      <legend>MOTORS</legend>
                      <MotorSummary motors={state.motors} compact />
                    </fieldset>
                  </div>
                </div>
              ) : (
                <p className="px-2 py-4 opacity-80">データ未受信 — 接続待機中...</p>
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
          onOpenChange={(open) => setPanelOpen((prev) => ({ ...prev, [key]: open }))}
        />
      ))}

      <div className="pointer-events-none fixed right-4 bottom-12 z-50 flex flex-col gap-2">
        {toast ? <HealthToast toast={toast} onDismiss={() => setToast(null)} /> : null}
      </div>
    </main>
  );
}
