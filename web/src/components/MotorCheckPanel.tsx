import { TuiButton, TuiModal, TuiProgress, cx, type TuiColor } from "@/components/tui";
import { useMotorCheck } from "@/hooks/useMotorCheck";
import type { MotorCheckOverall, MotorCheckRecord, MotorCheckResult } from "@/hooks/useRobotSocket";

interface MotorCheckPanelProps {
  robotName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// 各モータ結果を TUI 記号 + セマンティック色クラスで表現する。
const RESULT_STYLES: Record<MotorCheckResult, { symbol: string; textClass: string; label: string }> =
  {
    pending: { symbol: "○", textClass: "secondary-text", label: "待機中" },
    running: { symbol: "►", textClass: "info-text", label: "確認中" },
    passed: { symbol: "✓", textClass: "success-text", label: "合格" },
    failed: { symbol: "✗", textClass: "danger-text", label: "失敗" },
    timeout: { symbol: "⚠", textClass: "warning-text", label: "タイムアウト" },
    skipped: { symbol: "·", textClass: "secondary-text", label: "中断" },
  };

const OVERALL_STYLES: Record<
  MotorCheckOverall,
  { symbol: string; textClass: string; color: TuiColor; label: string }
> = {
  running: { symbol: "►", textClass: "info-text", color: "info", label: "実行中" },
  ok: { symbol: "✓", textClass: "success-text", color: "success", label: "全モータ合格" },
  partial: { symbol: "⚠", textClass: "warning-text", color: "warning", label: "一部失敗" },
  failed: { symbol: "✗", textClass: "danger-text", color: "danger", label: "失敗" },
};

function formatNumber(value: number): string {
  if (Number.isInteger(value)) return value.toFixed(0);
  if (Math.abs(value) >= 100) return value.toFixed(1);
  return value.toFixed(2);
}

function describeRecord(record: MotorCheckRecord): string {
  switch (record.result) {
    case "passed":
      return record.observed === null
        ? `期待 ${record.expected}`
        : `期待 ${record.expected} → 観測 ${formatNumber(record.observed)}`;
    case "failed":
      return record.detail ?? "失敗";
    case "timeout":
      return record.detail ?? "フィードバック無応答";
    case "skipped":
      return record.detail ?? "中断";
    case "running":
      return "応答待ち";
    case "pending":
    default:
      return "未開始";
  }
}

function MotorRow({ record, isCurrent }: { record: MotorCheckRecord; isCurrent: boolean }) {
  const result: MotorCheckResult =
    isCurrent && record.result === "pending" ? "running" : record.result;
  const style = RESULT_STYLES[result];
  const description = describeRecord({ ...record, result });

  return (
    <div className="flex items-center justify-between gap-3 px-1 py-1">
      <div className="flex min-w-0 items-center gap-2">
        <span className={cx("w-4 shrink-0 text-center font-bold", style.textClass)}>
          {style.symbol}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-bold">{record.motor}</span>
          <span className="text-xs opacity-60">bus: {record.bus}</span>
        </div>
      </div>
      <div className={cx("flex flex-col items-end gap-0.5 text-xs", style.textClass)}>
        <span className="font-bold">{style.label}</span>
        <span className="opacity-80">{description}</span>
      </div>
    </div>
  );
}

export function MotorCheckPanel({ robotName, isOpen, onOpenChange }: MotorCheckPanelProps) {
  const { state, start, abort } = useMotorCheck(robotName);

  const isRunning = state.status === "running";
  const isError = state.status === "error";
  const overall = state.snapshot?.overall ?? (isRunning ? "running" : null);
  const overallStyle = overall ? OVERALL_STYLES[overall] : null;

  const total = state.progress?.total ?? state.records.length;
  const index = state.progress?.index ?? state.records.length;
  const percent = total > 0 ? Math.min(100, Math.round((index / total) * 100)) : 0;

  const footerLabel = isRunning
    ? "実行中..."
    : state.status === "completed"
      ? "完了"
      : isError
        ? "失敗"
        : "未実行";

  return (
    <TuiModal
      isOpen={isOpen}
      onClose={() => onOpenChange(false)}
      title={`MOTOR CHECK — ${robotName}`}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-xs opacity-70">{footerLabel}</span>
          <div className="flex gap-2">
            {isRunning ? (
              <TuiButton variant="danger" flat onPress={abort}>
                ■ 中断
              </TuiButton>
            ) : state.records.length > 0 || isError ? (
              <TuiButton variant="info" flat onPress={start}>
                ► リトライ
              </TuiButton>
            ) : null}
            <TuiButton variant="secondary" flat onPress={() => onOpenChange(false)}>
              閉じる
            </TuiButton>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-3" style={{ minWidth: "min(560px, 80vw)" }}>
        {overallStyle ? (
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold opacity-80">OVERALL</span>
            <span className={cx("font-bold", overallStyle.textClass)}>
              [{overallStyle.symbol} {overallStyle.label}]
            </span>
          </div>
        ) : null}

        {isRunning ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="tabular-nums opacity-80">
                {index} / {total}
              </span>
              <span className="info-text truncate font-bold">{state.current ?? "—"}</span>
            </div>
            <TuiProgress value={percent} color="info" className="w-full" showLabel={false} />
          </div>
        ) : null}

        {isError ? (
          <div className="danger-text font-bold">
            <p>⚠ エラー</p>
            <p className="mt-1 text-sm opacity-90">{state.error}</p>
          </div>
        ) : null}

        {state.records.length === 0 && !isRunning && !isError ? (
          <p className="px-1 py-3 text-sm opacity-70">
            動作確認はまだ実行されていません。
          </p>
        ) : (
          <div className="tui-scroll flex flex-col" style={{ maxHeight: "50vh" }}>
            {state.records.map((record) => (
              <MotorRow
                key={record.motor}
                record={record}
                isCurrent={isRunning && state.current === record.motor}
              />
            ))}
          </div>
        )}
      </div>
    </TuiModal>
  );
}
