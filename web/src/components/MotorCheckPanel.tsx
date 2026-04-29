import { Button, Modal, Spinner } from "@heroui/react";
import { AlertTriangle, CheckCircle2, Circle, Minus, RotateCw, Timer, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useMotorCheck } from "../hooks/useMotorCheck";
import type {
  MotorCheckOverall,
  MotorCheckRecord,
  MotorCheckResult,
} from "../hooks/useRobotSocket";
import { Icon } from "./Icon";

interface MotorCheckPanelProps {
  robotName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ResultStyle {
  icon: LucideIcon;
  text: string;
  bg: string;
  ring: string;
  label: string;
}

const RESULT_STYLES: Record<MotorCheckResult, ResultStyle> = {
  pending: {
    icon: Circle,
    text: "text-[color:var(--color-text-muted)]",
    bg: "bg-[color:var(--color-surface-2)]",
    ring: "ring-[color:var(--color-border)]",
    label: "待機中",
  },
  running: {
    icon: RotateCw,
    text: "text-[color:var(--color-accent)]",
    bg: "bg-[color:var(--color-accent-soft)]",
    ring: "ring-[color:var(--color-accent)]/40",
    label: "確認中",
  },
  passed: {
    icon: CheckCircle2,
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    ring: "ring-emerald-500/40",
    label: "合格",
  },
  failed: {
    icon: XCircle,
    text: "text-red-700",
    bg: "bg-red-50",
    ring: "ring-red-500/40",
    label: "失敗",
  },
  timeout: {
    icon: Timer,
    text: "text-amber-700",
    bg: "bg-amber-50",
    ring: "ring-amber-500/40",
    label: "タイムアウト",
  },
  skipped: {
    icon: Minus,
    text: "text-[color:var(--color-text-subtle)]",
    bg: "bg-[color:var(--color-surface-2)]",
    ring: "ring-[color:var(--color-border)]",
    label: "中断",
  },
};

const OVERALL_STYLES: Record<
  MotorCheckOverall,
  { text: string; bg: string; ring: string; label: string; icon: LucideIcon }
> = {
  running: {
    text: "text-[color:var(--color-accent)]",
    bg: "bg-[color:var(--color-accent-soft)]",
    ring: "ring-[color:var(--color-accent)]/40",
    label: "実行中",
    icon: RotateCw,
  },
  ok: {
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    ring: "ring-emerald-500/40",
    label: "全モータ合格",
    icon: CheckCircle2,
  },
  partial: {
    text: "text-amber-700",
    bg: "bg-amber-50",
    ring: "ring-amber-500/40",
    label: "一部失敗",
    icon: AlertTriangle,
  },
  failed: {
    text: "text-red-700",
    bg: "bg-red-50",
    ring: "ring-red-500/40",
    label: "失敗",
    icon: XCircle,
  },
};

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

function formatNumber(value: number): string {
  if (Number.isInteger(value)) return value.toFixed(0);
  if (Math.abs(value) >= 100) return value.toFixed(1);
  return value.toFixed(2);
}

function MotorRow({ record, isCurrent }: { record: MotorCheckRecord; isCurrent: boolean }) {
  // current モータは記録上は pending のことがあるので running 表示に寄せる
  const result: MotorCheckResult =
    isCurrent && record.result === "pending" ? "running" : record.result;
  const style = RESULT_STYLES[result];
  const description = describeRecord({ ...record, result });

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-[10px] px-3 py-2 ring-1 ${style.bg} ${style.ring}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        {result === "running" ? (
          <Spinner size="sm" />
        ) : (
          <Icon icon={style.icon} size={18} strokeWidth={2.5} className={style.text} />
        )}
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-mono text-sm font-semibold text-[color:var(--color-text)]">
            {record.motor}
          </span>
          <span className="truncate text-xs text-[color:var(--color-text-muted)]">
            bus: {record.bus}
          </span>
        </div>
      </div>
      <div className={`flex flex-col items-end gap-0.5 text-xs ${style.text}`}>
        <span className="font-bold">{style.label}</span>
        <span className="font-mono opacity-80">{description}</span>
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

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
        <Modal.Container placement="center" size="lg">
          <Modal.Dialog className="bg-[color:var(--color-surface)]">
            <Modal.Header className="border-b border-[color:var(--color-border)]">
              <div className="flex w-full items-center justify-between gap-3">
                <Modal.Heading className="text-lg font-bold text-[color:var(--color-text)]">
                  動作確認 — {robotName}
                </Modal.Heading>
                {overallStyle ? (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${overallStyle.bg} ${overallStyle.text} ${overallStyle.ring}`}
                  >
                    <Icon icon={overallStyle.icon} size={14} strokeWidth={2.6} />
                    {overallStyle.label}
                  </span>
                ) : null}
              </div>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4 p-5">
              {isRunning ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-[color:var(--color-text-muted)]">
                    <span className="font-mono tabular-nums">
                      {index} / {total}
                    </span>
                    <span className="truncate font-semibold text-[color:var(--color-accent)]">
                      {state.current ?? "—"}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label="動作確認進行度"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="relative h-2 w-full overflow-hidden rounded-full bg-[color:var(--color-surface-2)]"
                  >
                    <div
                      className="h-full rounded-full bg-[color:var(--color-accent)] transition-[width] duration-300 ease-out"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              ) : null}

              {isError ? (
                <div className="flex items-start gap-2 rounded-[10px] bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-500/40">
                  <Icon icon={XCircle} size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold">エラー</div>
                    <div className="truncate">{state.error}</div>
                  </div>
                </div>
              ) : null}

              {state.records.length === 0 && !isRunning && !isError ? (
                <div className="rounded-[10px] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4 text-center text-sm text-[color:var(--color-text-muted)]">
                  動作確認はまだ実行されていません。
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {state.records.map((record) => (
                    <MotorRow
                      key={record.motor}
                      record={record}
                      isCurrent={isRunning && state.current === record.motor}
                    />
                  ))}
                </div>
              )}
            </Modal.Body>
            <Modal.Footer className="border-t border-[color:var(--color-border)]">
              <div className="flex w-full items-center justify-between gap-2">
                <div className="text-xs text-[color:var(--color-text-muted)]">
                  {isRunning
                    ? "実行中..."
                    : state.status === "completed"
                      ? "完了"
                      : isError
                        ? "失敗"
                        : "未実行"}
                </div>
                <div className="flex gap-2">
                  {isRunning ? (
                    <Button type="button" variant="outline" onClick={abort}>
                      中断
                    </Button>
                  ) : state.records.length > 0 || isError ? (
                    <Button type="button" variant="outline" onClick={start}>
                      リトライ
                    </Button>
                  ) : null}
                  <Button type="button" variant="primary" onClick={() => onOpenChange(false)}>
                    閉じる
                  </Button>
                </div>
              </div>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
