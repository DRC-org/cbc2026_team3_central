import { Disclosure } from "@heroui/react";
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

  if (Object.keys(motors).length === 0) {
    return <p className="text-lg text-gray-400">モータ情報なし</p>;
  }

  if (anomalyCount === 0) {
    return <p className="text-xl font-bold text-green-600">モータ: ✓ 全正常</p>;
  }

  return (
    <Disclosure>
      <Disclosure.Heading>
        <Disclosure.Trigger className="text-xl font-bold text-amber-600 hover:underline">
          ⚠ 異常 {anomalyCount} 件
          <Disclosure.Indicator />
        </Disclosure.Trigger>
      </Disclosure.Heading>
      <Disclosure.Content>
        <Disclosure.Body>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(motors)
              .filter(([, m]) => m.temp >= TEMP_WARNING)
              .map(([name, state]) => (
                <MotorStatus key={name} name={name} state={state} />
              ))}
          </div>
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}
