import { Skeleton } from "@heroui/react";
import { Bot } from "lucide-react";
import { Link } from "react-router-dom";

import { Icon } from "../components/Icon";
import { MotorSummary } from "../components/MotorSummary";
import { SequenceProgress } from "../components/SequenceProgress";
import { useRobot } from "../context/RobotContext";

const ROBOTS = [
  { key: "main_hand", label: "メインハンド", path: "/main-hand" },
  { key: "sub_hand", label: "サブハンド", path: "/sub-hand" },
] as const;

export function Dashboard() {
  const { states } = useRobot();

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-10">
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
    </main>
  );
}
