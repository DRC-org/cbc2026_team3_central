import { useState } from "react";
import type { MotorState } from "../hooks/useRobotSocket";
import { MotorStatus } from "./MotorStatus";

interface MotorSummaryProps {
  motors: Record<string, MotorState>;
}

const TEMP_WARNING = 60;

function countAnomalies(motors: Record<string, MotorState>): number {
  return Object.values(motors).filter((m) => m.temp >= TEMP_WARNING).length;
}

export function MotorSummary({ motors }: MotorSummaryProps) {
  const anomalyCount = countAnomalies(motors);
  const [expanded, setExpanded] = useState(false);

  if (Object.keys(motors).length === 0) {
    return <p className="text-lg text-gray-400">モータ情報なし</p>;
  }

  return (
    <div>
      <button
        onClick={() => anomalyCount > 0 && setExpanded(!expanded)}
        className={`text-xl font-bold ${
          anomalyCount > 0
            ? "cursor-pointer text-amber-600 hover:underline"
            : "cursor-default text-green-600"
        }`}
      >
        {anomalyCount > 0 ? `⚠ 異常 ${anomalyCount} 件` : "モータ: ✓ 全正常"}
      </button>

      {anomalyCount > 0 && expanded && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(motors)
            .filter(([, m]) => m.temp >= TEMP_WARNING)
            .map(([name, state]) => (
              <MotorStatus key={name} name={name} state={state} />
            ))}
        </div>
      )}
    </div>
  );
}
