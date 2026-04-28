import { useNavigate } from "react-router-dom";
import { Card, Chip, Skeleton } from "@heroui/react";
import { useRobot } from "../context/RobotContext";
import { SequenceProgress } from "../components/SequenceProgress";

const ROBOTS = [
  { key: "main_hand", label: "メインハンド", path: "/main-hand" },
  { key: "sub_hand", label: "サブハンド", path: "/sub-hand" },
] as const;

export function Dashboard() {
  const { states, connected } = useRobot();
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">両ロボットの状態概要</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {ROBOTS.map(({ key, label, path }) => {
          const state = states[key];
          return (
            <Card
              key={key}
              className="cursor-pointer p-6 transition-shadow hover:shadow-lg"
              onClick={() => navigate(path)}
            >
              <Card.Header className="pb-4">
                <div className="flex items-center justify-between">
                  <Card.Title className="text-xl font-bold">{label}</Card.Title>
                  {connected && state ? (
                    <Chip color="success" variant="soft" size="sm">
                      稼働中
                    </Chip>
                  ) : (
                    <Chip color="default" variant="soft" size="sm">
                      未接続
                    </Chip>
                  )}
                </div>
              </Card.Header>
              <Card.Content>
                {state ? (
                  <div className="space-y-3">
                    <SequenceProgress
                      sequence={state.sequence}
                      currentStep={state.current_step}
                      stepIndex={state.step_index}
                      totalSteps={state.total_steps}
                      waitingTrigger={state.waiting_trigger}
                    />
                    <p className="text-sm text-gray-500">
                      モータ数: {Object.keys(state.motors).length}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-4 w-1/2 rounded" />
                    <Skeleton className="h-3 w-full rounded" />
                    <p className="mt-2 text-sm text-gray-400">データ未受信</p>
                  </div>
                )}
              </Card.Content>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
