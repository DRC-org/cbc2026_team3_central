import { Alert, Card, CloseButton, Skeleton } from "@heroui/react";
import { linkVariants } from "@heroui/styles";
import { Bot } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";

import { HealthIndicator } from "@/components/HealthIndicator";
import { MotorCheckButton } from "@/components/MotorCheckButton";
import { MotorCheckPanel } from "@/components/MotorCheckPanel";
import { MotorSummary } from "@/components/MotorSummary";
import { SequenceProgress } from "@/components/SequenceProgress";
import { useRobot } from "@/context/RobotContext";
import type { BusHealthState, HealthChangeEvent, HealthSnapshot } from "@/hooks/useRobotSocket";

const ROBOTS = [
  { key: "main_hand", label: "メインハンド", path: "/main-hand" },
  { key: "sub_hand", label: "サブハンド", path: "/sub-hand" },
] as const;

const STATE_RANK: Record<BusHealthState, number> = { ok: 0, degraded: 1, down: 2 };

function worstOverall(snapshots: (HealthSnapshot | undefined)[]): BusHealthState | undefined {
  let worst: BusHealthState | undefined;
  for (const snap of snapshots) {
    if (!snap) continue;
    if (worst === undefined || STATE_RANK[snap.overall] > STATE_RANK[worst]) {
      worst = snap.overall;
    }
  }
  return worst;
}

const TOAST_VISIBLE_MS = 5000;

interface ToastState {
  event: HealthChangeEvent;
  id: number;
}

function HealthToast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  const status = toast.event.level === "critical" ? "danger" : "warning";
  return (
    <Alert
      status={status}
      className="pointer-events-auto w-80 max-w-[calc(100vw-2rem)] shadow-[var(--shadow-elev)]"
    >
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>
          <span className="text-xs font-bold tracking-wider uppercase">{toast.event.level}</span>
          <span className="ml-2 font-mono text-xs opacity-80">{toast.event.robot}</span>
        </Alert.Title>
        <Alert.Description>
          <div className="font-mono text-xs opacity-80">{toast.event.target}</div>
          <div className="mt-1 text-sm font-semibold">
            {toast.event.from} → {toast.event.to}
          </div>
          {toast.event.message ? (
            <div className="mt-1 truncate text-xs opacity-80">{toast.event.message}</div>
          ) : null}
        </Alert.Description>
      </Alert.Content>
      <CloseButton aria-label="通知を閉じる" onPress={onDismiss} />
    </Alert>
  );
}

export function Dashboard() {
  const { states, healthEvents } = useRobot();
  const [toast, setToast] = useState<ToastState | null>(null);
  const [panelOpen, setPanelOpen] = useState<Record<string, boolean>>({});

  const overall = useMemo(
    () => worstOverall(ROBOTS.map(({ key }) => states[key]?.health)),
    [states],
  );

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
    <main className="mx-auto w-full max-w-7xl flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-10">
      <div className="mb-5 flex items-center justify-between gap-3 md:mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wider text-[color:var(--color-text-subtle)] uppercase">
            CAN ヘルス
          </span>
          <HealthIndicator
            variant="pill"
            health={
              overall
                ? {
                    timestamp: 0,
                    overall,
                    buses: [],
                    motors: [],
                  }
                : undefined
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        {ROBOTS.map(({ key, label, path }) => {
          const state = states[key];
          return (
            <Card key={key} variant="default" className="gap-6 !p-6 md:!p-8">
              <Card.Header className="flex flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]">
                    <Bot size={22} strokeWidth={2.4} />
                  </span>
                  <div>
                    <Card.Title className="text-2xl font-extrabold md:text-3xl">{label}</Card.Title>
                    <Card.Description className="text-xs font-medium">
                      {state ? "受信中" : "データ未受信"}
                    </Card.Description>
                  </div>
                </div>
                <RouterLink
                  to={path}
                  className={`${linkVariants().base()} rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1.5 text-sm font-semibold !no-underline hover:bg-[color:var(--color-accent-soft)]`}
                >
                  操縦画面 →
                </RouterLink>
              </Card.Header>

              {state ? (
                <Card.Content className="flex flex-col gap-6">
                  <SequenceProgress
                    sequence={state.sequence}
                    currentStep={state.current_step}
                    stepIndex={state.step_index}
                    totalSteps={state.total_steps}
                    waitingTrigger={state.waiting_trigger}
                    large
                  />
                  <HealthIndicator variant="card" health={state.health} />
                  <div className="flex flex-wrap items-center gap-2">
                    <MotorCheckButton
                      robotName={key}
                      onPanelOpen={() => setPanelOpen((prev) => ({ ...prev, [key]: true }))}
                    />
                    <button
                      type="button"
                      onClick={() => setPanelOpen((prev) => ({ ...prev, [key]: true }))}
                      className={`${linkVariants().base()} rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1.5 text-xs font-semibold !text-[color:var(--color-text-muted)] !no-underline hover:bg-[color:var(--color-surface-2)] hover:!text-[color:var(--color-text)]`}
                    >
                      結果を表示
                    </button>
                  </div>
                  <MotorSummary motors={state.motors} />
                </Card.Content>
              ) : (
                <Card.Content className="space-y-3">
                  <Skeleton className="h-7 w-3/4 rounded" />
                  <Skeleton className="h-12 w-1/2 rounded" />
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-16 w-full rounded" />
                </Card.Content>
              )}
            </Card>
          );
        })}
      </div>

      {ROBOTS.map(({ key }) => (
        <MotorCheckPanel
          key={key}
          robotName={key}
          isOpen={Boolean(panelOpen[key])}
          onOpenChange={(open) => setPanelOpen((prev) => ({ ...prev, [key]: open }))}
        />
      ))}

      <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col gap-2 md:right-6 md:bottom-6">
        {toast ? <HealthToast toast={toast} onDismiss={() => setToast(null)} /> : null}
      </div>
    </main>
  );
}
