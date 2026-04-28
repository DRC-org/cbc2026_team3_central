import { Card } from "@heroui/react";
import type { MotorState } from "../hooks/useRobotSocket";

interface MotorStatusProps {
  name: string;
  state: MotorState;
}

const TEMP_WARNING = 60;
const TEMP_DANGER = 80;

function tempColorClass(temp: number): string {
  if (temp >= TEMP_DANGER) return "text-red-600 font-bold";
  if (temp >= TEMP_WARNING) return "text-amber-500 font-bold";
  return "text-gray-800";
}

export function MotorStatus({ name, state }: MotorStatusProps) {
  return (
    <Card className="p-4">
      <Card.Header className="pb-2">
        <Card.Title className="text-base font-bold text-primary">
          {name}
        </Card.Title>
      </Card.Header>
      <Card.Content className="pt-0">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <p className="text-xs text-gray-500">位置</p>
            <p className="font-mono text-sm text-gray-800">
              {state.pos.toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">速度</p>
            <p className="font-mono text-sm text-gray-800">
              {state.vel.toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">トルク</p>
            <p className="font-mono text-sm text-gray-800">
              {state.torque.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">温度</p>
            <p className={`font-mono text-sm ${tempColorClass(state.temp)}`}>
              {state.temp.toFixed(0)}&#8451;
            </p>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}
