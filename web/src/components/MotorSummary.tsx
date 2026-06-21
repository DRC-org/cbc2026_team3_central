import { MotorStatus } from "@/components/MotorStatus";
import type { MotorState } from "@/hooks/useRobotSocket";
import { cx } from "@/lib/cx";

interface MotorSummaryProps {
  motors: Record<string, MotorState>;
}

const TEMP_WARNING = 60;

function countAnomalies(motors: Record<string, MotorState>): number {
  return Object.values(motors).filter((m) => m.temp >= TEMP_WARNING).length;
}

// 正常/異常を記号と色で表す共通ヘッダ。compact/非compact 双方で使う。
function SummaryBadge({
  hasAnomaly,
  anomalyCount,
  total,
}: {
  hasAnomaly: boolean;
  anomalyCount: number;
  total: number;
}) {
  return (
    <span
      className={cx(hasAnomaly ? "warning-text" : "success-text")}
      style={{ whiteSpace: "nowrap", fontWeight: "bold" }}
    >
      [{hasAnomaly ? "⚠" : "✓"}{" "}
      {hasAnomaly ? `異常 ${anomalyCount} 件` : `全 ${total} 台 正常`}]
    </span>
  );
}

export function MotorSummary({ motors }: MotorSummaryProps) {
  const total = Object.keys(motors).length;
  const anomalyCount = countAnomalies(motors);

  if (total === 0) {
    return (
      <div style={{ padding: 8, fontSize: "0.875rem", opacity: 0.7 }}>
        モータ情報なし
      </div>
    );
  }

  const hasAnomaly = anomalyCount > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 6 }}>
      <div
        style={{
          display: "flex",
          flexShrink: 0,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h3
          style={{
            fontSize: "0.75rem",
            fontWeight: "bold",
            letterSpacing: "0.05em",
            opacity: 0.8,
          }}
        >
          MOTORS
        </h3>
        <SummaryBadge
          hasAnomaly={hasAnomaly}
          anomalyCount={anomalyCount}
          total={total}
        />
      </div>
      <div className="tui-scroll" style={{ flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {Object.entries(motors).map(([name, state]) => (
            <MotorStatus key={name} name={name} state={state} />
          ))}
        </div>
      </div>
    </div>
  );
}
