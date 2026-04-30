import { Skeleton } from "@heroui/react";
import { AlertTriangle, Bot, X, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { HealthIndicator } from "@/components/HealthIndicator";
import { Icon } from "@/components/Icon";
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

// 両ロボットの中で最も悪い overall を全体ヘッダ表示に使う
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
  // 同一イベントの再描画判定に使うため receivedAt を id 兼用にする
  id: number;
}

function HealthToast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  const isCritical = toast.event.level === "critical";
  const tone = isCritical
    ? {
        bg: "bg-red-50",
        text: "text-red-700",
        ring: "ring-red-500/40",
        icon: XCircle,
      }
    : {
        bg: "bg-amber-50",
        text: "text-amber-700",
        ring: "ring-amber-500/40",
        icon: AlertTriangle,
      };

  return (
    <div
      role="alert"
      className={`pointer-events-auto flex w-80 max-w-[calc(100vw-2rem)] items-start gap-3 rounded-[var(--radius-card)] p-4 shadow-[var(--shadow-elev)] ring-1 ${tone.bg} ${tone.text} ${tone.ring}`}
    >
      <Icon icon={tone.icon} size={20} strokeWidth={2.5} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
          <span>{toast.event.level}</span>
          <span className="opacity-60">·</span>
          <span className="font-mono normal-case opacity-80">{toast.event.robot}</span>
        </div>
        <div className="mt-1 truncate font-mono text-xs opacity-80">{toast.event.target}</div>
        <div className="mt-1 text-sm font-semibold">
          {toast.event.from} → {toast.event.to}
        </div>
        {toast.event.message ? (
          <div className="mt-1 truncate text-xs opacity-80">{toast.event.message}</div>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="通知を閉じる"
        onClick={onDismiss}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md hover:bg-black/5 ${tone.text}`}
      >
        <Icon icon={X} size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}

export function Dashboard() {
  const { states, healthEvents } = useRobot();
  const [toast, setToast] = useState<ToastState | null>(null);
  // ロボット名 → パネル開閉。ボタン押下で開く、閉じるは手動
  const [panelOpen, setPanelOpen] = useState<Record<string, boolean>>({});

  const overall = useMemo(
    () => worstOverall(ROBOTS.map(({ key }) => states[key]?.health)),
    [states],
  );

  // info レベルは UI ノイズになるので警告以上のみ表示。直近 1 件を 5 秒間
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
            <article
              key={key}
              className="flex flex-col gap-6 rounded-[var(--radius-card)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-card)] md:p-8"
            >
              <header className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]">
                    <Icon icon={Bot} size={22} strokeWidth={2.4} />
                  </span>
                  <div>
                    <h2 className="text-2xl font-extrabold text-[color:var(--color-text)] md:text-3xl">
                      {label}
                    </h2>
                    <p className="text-xs font-medium text-[color:var(--color-text-muted)]">
                      {state ? "受信中" : "データ未受信"}
                    </p>
                  </div>
                </div>
                <Link
                  to={path}
                  className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1.5 text-sm font-semibold text-[color:var(--color-accent)] transition hover:bg-[color:var(--color-accent-soft)] focus-visible:ring-4 focus-visible:ring-[color:var(--color-accent)]/30 focus-visible:outline-none"
                >
                  操縦画面 →
                </Link>
              </header>

              {state ? (
                <>
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
                      className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-text-muted)] transition hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-text)] focus-visible:ring-4 focus-visible:ring-[color:var(--color-accent)]/30 focus-visible:outline-none"
                    >
                      結果を表示
                    </button>
                  </div>
                  <MotorSummary motors={state.motors} />
                </>
              ) : (
                <div className="space-y-3">
                  <Skeleton className="h-7 w-3/4 rounded" />
                  <Skeleton className="h-12 w-1/2 rounded" />
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-16 w-full rounded" />
                </div>
              )}
            </article>
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
