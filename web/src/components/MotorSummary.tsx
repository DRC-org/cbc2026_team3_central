import { useState } from "react";

import { MotorStatus } from "@/components/MotorStatus";
import { cx } from "@/components/tui";
import type { MotorState } from "@/hooks/useRobotSocket";

interface MotorSummaryProps {
  motors: Record<string, MotorState>;
  compact?: boolean;
}

const TEMP_WARNING = 60;

function countAnomalies(motors: Record<string, MotorState>): number {
  return Object.values(motors).filter((m) => m.temp >= TEMP_WARNING).length;
}

// 正常/異常を記号と色で表す共通ヘッダ。compact/非compact 双方で使う。
function SummaryBadge({ hasAnomaly, anomalyCount, total }: {
  hasAnomaly: boolean;
  anomalyCount: number;
  total: number;
}) {
  return (
    <span className={cx("whitespace-nowrap font-bold", hasAnomaly ? "warning-text" : "success-text")}>
      [{hasAnomaly ? "⚠" : "✓"} {hasAnomaly ? `異常 ${anomalyCount} 件` : `全 ${total} 台 正常`}]
    </span>
  );
}

export function MotorSummary({ motors, compact = false }: MotorSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const total = Object.keys(motors).length;
  const anomalyCount = countAnomalies(motors);

  if (total === 0) {
    return <div className="p-2 text-sm opacity-70">モータ情報なし</div>;
  }

  const hasAnomaly = anomalyCount > 0;

  if (compact) {
    return (
      <div className="tui-col flex-1" style={{ gap: 6 }}>
        <div className="flex shrink-0 items-center justify-between">
          <h3 className="text-xs font-bold tracking-wider opacity-80">MOTORS</h3>
          <SummaryBadge hasAnomaly={hasAnomaly} anomalyCount={anomalyCount} total={total} />
        </div>
        <div className="tui-scroll flex-1">
          <div className="flex flex-col">
            {Object.entries(motors).map(([name, state]) => (
              <MotorStatus key={name} name={name} state={state} compact />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 非 compact: Disclosure 相当を React state で実装（HeroUI/lucide 撤去）。
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 px-2 py-2 text-left"
        style={{ cursor: "pointer", border: "none", background: "transparent" }}
      >
        <span className="flex items-center gap-2">
          <span className="w-3 tabular-nums">{expanded ? "▾" : "▸"}</span>
          <SummaryBadge hasAnomaly={hasAnomaly} anomalyCount={anomalyCount} total={total} />
        </span>
        <span className="text-xs opacity-60">
          {expanded ? "クリックで折りたたみ" : "クリックで詳細表示"}
        </span>
      </button>
      {expanded ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(motors).map(([name, state]) => (
            <MotorStatus key={name} name={name} state={state} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
