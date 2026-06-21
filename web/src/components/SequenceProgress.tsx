import { TuiProgressBar } from "react-tuicss";

import { cx } from "@/lib/cx";
import { PROGRESS_BAR_VARIANT, type TuiColor } from "@/lib/tuiColor";

interface SequenceProgressProps {
  sequence: string;
  currentStep: string | null;
  stepIndex: number;
  totalSteps: number;
  waitingTrigger: boolean;
  large?: boolean;
}

type StatusKey = "complete" | "waiting" | "running" | "idle";

// TUI 記号 + セマンティック色でステータスを表現する。
const STATUS: Record<StatusKey, { label: string; symbol: string; color: TuiColor }> = {
  complete: { label: "完了", symbol: "✓", color: "success" },
  waiting: { label: "許可待ち", symbol: "▮", color: "warning" },
  running: { label: "実行中", symbol: "►", color: "info" },
  idle: { label: "未開始", symbol: "○", color: "secondary" },
};

export function SequenceProgress({
  sequence,
  currentStep,
  stepIndex,
  totalSteps,
  waitingTrigger,
  large = false,
}: SequenceProgressProps) {
  // バックエンドは完走時に step_index = total_steps を返すため、
  // 表示用には total を超えないようクランプし、% も 0..100 に収める
  const isComplete = totalSteps > 0 && stepIndex >= totalSteps && !waitingTrigger;
  const displayIndex = totalSteps > 0 ? Math.min(stepIndex + 1, totalSteps) : 0;
  const percent =
    totalSteps > 0
      ? Math.min(100, ((isComplete ? totalSteps : stepIndex + 1) / totalSteps) * 100)
      : 0;
  const statusKey: StatusKey =
    totalSteps === 0 ? "idle" : isComplete ? "complete" : waitingTrigger ? "waiting" : "running";
  const status = STATUS[statusKey];

  const Bar = TuiProgressBar[PROGRESS_BAR_VARIANT[status.color]];

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", minWidth: 0, alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>SEQ</span>
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontWeight: "bold",
              fontSize: large ? "1rem" : "0.875rem",
            }}
          >
            {sequence}
          </span>
        </div>
        <span
          className={cx(`${status.color}-text`)}
          style={{ flexShrink: 0, whiteSpace: "nowrap", fontWeight: "bold" }}
        >
          [{status.symbol} {status.label}]
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", minWidth: 0, alignItems: "baseline", gap: 8 }}>
          <span
            className="tabular-nums"
            style={{ fontWeight: "bold", fontSize: large ? "2.25rem" : "1.875rem" }}
          >
            {displayIndex}
          </span>
          <span style={{ fontSize: "1.125rem", opacity: 0.7 }}>/ {totalSteps}</span>
          <span
            style={{
              marginLeft: 4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontWeight: 600,
              fontSize: large ? "1rem" : "0.875rem",
            }}
            title={currentStep ?? undefined}
          >
            {currentStep ? `› ${currentStep}` : "—"}
          </span>
        </div>
        <span className="tabular-nums" style={{ flexShrink: 0, fontWeight: "bold", opacity: 0.9 }}>
          {Math.round(percent)}%
        </span>
      </div>

      <Bar progress={percent} barWidth="100%" />
    </section>
  );
}
