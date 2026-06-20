import { useState } from "react";

import { TuiButton, TuiModal } from "@/components/tui";
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
      ? "緊急停止中は不可"
      : sequenceRunning
        ? "シーケンス実行中は不可"
        : checkRunning
          ? "動作確認 実行中"
          : null;

  const handleConfirmStart = () => {
    start();
    setConfirmOpen(false);
    onPanelOpen?.();
  };

  return (
    <div className="flex items-center gap-2">
      <TuiButton
        variant="info"
        flat
        isDisabled={disabled}
        onPress={() => setConfirmOpen(true)}
        aria-label={`${robotName} の動作確認を開始`}
      >
        {checkRunning ? "► 確認実行中..." : "▮ 動作確認"}
      </TuiButton>
      {/* Tooltip は使えないため無効化理由を等幅テキストで併記する。 */}
      {disabled && reasonLabel ? (
        <span className="text-xs opacity-70">[?] {reasonLabel}</span>
      ) : null}

      <TuiModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="ACTUATOR CHECK"
        footer={
          <div className="flex justify-end gap-2">
            <TuiButton variant="secondary" flat onPress={() => setConfirmOpen(false)}>
              キャンセル
            </TuiButton>
            <TuiButton variant="info" flat onPress={handleConfirmStart}>
              開始
            </TuiButton>
          </div>
        }
      >
        <p className="font-bold">
          <span className="info-text">{robotName}</span> の全モータを順番に微小駆動します。
        </p>
        <p className="mt-2 text-sm danger-text font-bold">
          ⚠ 周囲の安全を確認してから開始してください。
        </p>
        <p className="mt-1 text-sm opacity-80">
          実行中も緊急停止 (EMG STOP) は即時優先で動作します。
        </p>
      </TuiModal>
    </div>
  );
}
