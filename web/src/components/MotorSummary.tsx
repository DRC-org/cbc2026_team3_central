import { Button, Chip, Disclosure, ScrollShadow } from "@heroui/react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState } from "react";

import { MotorStatus } from "@/components/MotorStatus";
import type { MotorState } from "@/hooks/useRobotSocket";

interface MotorSummaryProps {
  motors: Record<string, MotorState>;
  compact?: boolean;
}

const TEMP_WARNING = 60;

function countAnomalies(motors: Record<string, MotorState>): number {
  return Object.values(motors).filter((m) => m.temp >= TEMP_WARNING).length;
}

export function MotorSummary({ motors, compact = false }: MotorSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const total = Object.keys(motors).length;
  const anomalyCount = countAnomalies(motors);

  if (total === 0) {
    return (
      <div className="rounded-[10px] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-3 text-xs text-[color:var(--color-text-muted)]">
        モータ情報なし
      </div>
    );
  }

  const hasAnomaly = anomalyCount > 0;

  if (compact) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex shrink-0 items-center justify-between">
          <h3 className="text-[10px] font-bold tracking-wider text-[color:var(--color-text-subtle)] uppercase">
            モータ
          </h3>
          <Chip color={hasAnomaly ? "warning" : "success"} variant="soft" size="sm">
            {hasAnomaly ? (
              <AlertTriangle size={11} strokeWidth={2.5} />
            ) : (
              <CheckCircle2 size={11} strokeWidth={2.5} />
            )}
            <Chip.Label>
              {hasAnomaly ? `異常 ${anomalyCount} 件` : `全 ${total} 台 正常`}
            </Chip.Label>
          </Chip>
        </div>
        <ScrollShadow className="min-h-0 flex-1" hideScrollBar size={20}>
          <div className="flex flex-col gap-1.5">
            {Object.entries(motors).map(([name, state]) => (
              <MotorStatus key={name} name={name} state={state} compact />
            ))}
          </div>
        </ScrollShadow>
      </div>
    );
  }

  return (
    <Disclosure isExpanded={expanded} onExpandedChange={setExpanded}>
      <Disclosure.Heading>
        <Button
          slot="trigger"
          variant="outline"
          fullWidth
          className={`!h-auto justify-between rounded-[var(--radius-card)] px-4 py-3 ${
            hasAnomaly
              ? "!border-[color:var(--color-warning)]/40 !bg-[color:var(--color-warning-soft)]"
              : "!border-[color:var(--color-success)]/30 !bg-[color:var(--color-success-soft)]"
          }`}
        >
          <span className="flex items-center gap-3">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full ${
                hasAnomaly
                  ? "bg-[color:var(--color-warning)]/20 text-[color:oklch(45%_0.16_70)]"
                  : "bg-[color:var(--color-success)]/20 text-[color:oklch(35%_0.16_150)]"
              }`}
            >
              {hasAnomaly ? (
                <AlertTriangle size={18} strokeWidth={2.5} />
              ) : (
                <CheckCircle2 size={18} strokeWidth={2.5} />
              )}
            </span>
            <span className="flex flex-col text-left">
              <span
                className={`text-sm font-bold ${
                  hasAnomaly
                    ? "text-[color:oklch(45%_0.16_70)]"
                    : "text-[color:oklch(35%_0.16_150)]"
                }`}
              >
                {hasAnomaly ? `異常 ${anomalyCount} 件` : `モータ全 ${total} 台 正常`}
              </span>
              <span className="text-xs font-normal text-[color:var(--color-text-muted)]">
                {expanded ? "クリックで折りたたみ" : "クリックで詳細表示"}
              </span>
            </span>
          </span>
          <Disclosure.Indicator />
        </Button>
      </Disclosure.Heading>
      <Disclosure.Content>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(motors).map(([name, state]) => (
            <MotorStatus key={name} name={name} state={state} />
          ))}
        </div>
      </Disclosure.Content>
    </Disclosure>
  );
}
