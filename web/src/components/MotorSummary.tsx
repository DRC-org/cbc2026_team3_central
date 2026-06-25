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

function SummaryBadge({
  hasAnomaly,
  anomalyCount,
}: {
  hasAnomaly: boolean;
  anomalyCount: number;
}) {
  return (
    <span
      className={cx(hasAnomaly ? "warning-text" : "success-text")}
      style={{ whiteSpace: "nowrap" }}
    >
      [{hasAnomaly ? "⚠" : "✓"}{" "}
      {hasAnomaly ? `異常 ${anomalyCount} 件` : `All operational`}]
    </span>
  );
}

export function MotorSummary({ motors }: MotorSummaryProps) {
  const total = Object.keys(motors).length;
  const anomalyCount = countAnomalies(motors);

  if (total === 0) {
    return (
      <div style={{ padding: 8, opacity: 0.7 }}>
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
            opacity: 0.8,
          }}
        >
          MOTORS
        </h3>
        <SummaryBadge hasAnomaly={hasAnomaly} anomalyCount={anomalyCount} />
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
