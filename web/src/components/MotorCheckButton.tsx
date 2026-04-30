import { Button, Modal, Spinner, Tooltip } from "@heroui/react";
import { Activity, AlertTriangle } from "lucide-react";
import { useState } from "react";

import { useRobot } from "@/context/RobotContext";
import { useMotorCheck } from "@/hooks/useMotorCheck";

interface MotorCheckButtonProps {
  robotName: string;
  onPanelOpen?: () => void;
}

export function MotorCheckButton({ robotName, onPanelOpen }: MotorCheckButtonProps) {
  const { eStopActive, connected, states } = useRobot();
  const { state, start } = useMotorCheck(robotName);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const robotState = states[robotName];
  const sequenceRunning = Boolean(
    robotState &&
    robotState.total_steps > 0 &&
    !robotState.waiting_trigger &&
    robotState.step_index + 1 < robotState.total_steps,
  );

  const checkRunning = state.status === "running";
  const disabled = eStopActive || sequenceRunning || checkRunning || !connected;

  const reasonLabel = !connected
    ? "切断中のため不可"
    : eStopActive
      ? "緊急停止中は実行できません"
      : sequenceRunning
        ? "シーケンス実行中は実行できません"
        : checkRunning
          ? "動作確認 実行中"
          : "全モータの応答を順番に確認します";

  const handleConfirmStart = () => {
    start();
    setConfirmOpen(false);
    onPanelOpen?.();
  };

  return (
    <>
      <Tooltip>
        <Tooltip.Trigger>
          <Button
            variant="outline"
            size="md"
            isDisabled={disabled}
            onPress={() => setConfirmOpen(true)}
            aria-label={`${robotName} の動作確認を開始`}
          >
            {checkRunning ? (
              <>
                <Spinner size="sm" />
                <span className="text-sm font-semibold">実行中...</span>
              </>
            ) : (
              <>
                <Activity size={16} strokeWidth={2.5} />
                <span className="text-sm font-semibold">動作確認</span>
              </>
            )}
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>{reasonLabel}</Tooltip.Content>
      </Tooltip>

      <Modal>
        <Modal.Backdrop isOpen={confirmOpen} onOpenChange={setConfirmOpen}>
          <Modal.Container placement="center" size="sm">
            <Modal.Dialog className="bg-[color:var(--color-surface)]">
              <Modal.Header className="border-b border-[color:var(--color-border)]">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--color-warning-soft)] text-[color:oklch(45%_0.16_70)]">
                    <AlertTriangle size={20} strokeWidth={2.5} />
                  </span>
                  <Modal.Heading className="text-lg font-bold text-[color:var(--color-text)]">
                    アクチュエータ動作確認
                  </Modal.Heading>
                </div>
              </Modal.Header>
              <Modal.Body className="p-5">
                <p className="text-sm text-[color:var(--color-text)]">
                  <span className="font-semibold">{robotName}</span>{" "}
                  の全モータを順番に微小駆動します。
                </p>
                <p className="mt-2 text-sm font-semibold text-[color:var(--color-danger)]">
                  周囲の安全を確認してから開始してください。
                </p>
                <p className="mt-3 text-xs text-[color:var(--color-text-muted)]">
                  実行中も緊急停止ボタンは即時優先で動作します。
                </p>
              </Modal.Body>
              <Modal.Footer className="border-t border-[color:var(--color-border)]">
                <div className="flex w-full justify-end gap-2">
                  <Button slot="close" variant="ghost">
                    キャンセル
                  </Button>
                  <Button variant="primary" onPress={handleConfirmStart}>
                    開始
                  </Button>
                </div>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
