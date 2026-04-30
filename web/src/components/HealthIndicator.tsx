import { Card, Chip } from "@heroui/react";
import { Activity, AlertTriangle, Cable, CheckCircle2, Cpu, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type {
  BusHealth,
  BusHealthState,
  HealthSnapshot,
  MotorHealth,
  MotorHealthState,
} from "@/hooks/useRobotSocket";

interface HealthIndicatorProps {
  health: HealthSnapshot | undefined;
  variant?: "pill" | "card" | "compact" | "bus-only";
}

type Tone = "success" | "warning" | "danger" | "neutral";
type ChipColor = "success" | "warning" | "danger" | "default";

interface ToneStyle {
  label: string;
  icon: LucideIcon;
  chipColor: ChipColor;
  rowBg: string;
  rowText: string;
}

const TONE_STYLES: Record<Tone, ToneStyle> = {
  success: {
    label: "OK",
    icon: CheckCircle2,
    chipColor: "success",
    rowBg: "bg-[color:var(--color-success-soft)]",
    rowText: "text-[color:oklch(35%_0.16_150)]",
  },
  warning: {
    label: "DEGRADED",
    icon: AlertTriangle,
    chipColor: "warning",
    rowBg: "bg-[color:var(--color-warning-soft)]",
    rowText: "text-[color:oklch(45%_0.16_70)]",
  },
  danger: {
    label: "DOWN",
    icon: XCircle,
    chipColor: "danger",
    rowBg: "bg-[color:var(--color-danger-soft)]",
    rowText: "text-[color:oklch(40%_0.22_25)]",
  },
  neutral: {
    label: "未取得",
    icon: Activity,
    chipColor: "default",
    rowBg: "bg-[color:var(--color-surface-2)]",
    rowText: "text-[color:var(--color-text-muted)]",
  },
};

function busTone(state: BusHealthState): Tone {
  if (state === "ok") return "success";
  if (state === "degraded") return "warning";
  return "danger";
}

function motorTone(state: MotorHealthState): Tone {
  if (state === "ok") return "success";
  if (state === "stale" || state === "warning") return "warning";
  return "danger";
}

export function formatAge(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return "—";
  if (ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms 前`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s 前`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m 前`;
  return `${Math.floor(ms / 3_600_000)}h 前`;
}

function buildSummary(health: HealthSnapshot): string {
  const badBuses = health.buses.filter((b) => b.state !== "ok");
  const badMotors = health.motors.filter((m) => m.state !== "ok");
  const fragments: string[] = [];
  for (const b of badBuses) fragments.push(`bus ${b.name} ${b.state}`);
  for (const m of badMotors) fragments.push(`motor ${m.name} ${m.state}`);
  return fragments.join(", ");
}

function PillMode({ health }: { health: HealthSnapshot }) {
  const style = TONE_STYLES[busTone(health.overall)];
  const summary = buildSummary(health);
  const tooltip =
    summary.length > 0
      ? `${style.label}: ${summary}`
      : `${style.label} (バス ${health.buses.length} / モータ ${health.motors.length})`;
  return (
    <span title={tooltip} role="status" aria-label={`ヘルス ${style.label}`}>
      <Chip color={style.chipColor} variant="soft" size="md">
        <style.icon size={12} strokeWidth={2.6} />
        <Chip.Label>{style.label}</Chip.Label>
      </Chip>
    </span>
  );
}

function CompactMode({ health }: { health: HealthSnapshot }) {
  const style = TONE_STYLES[busTone(health.overall)];
  const summary = buildSummary(health);
  return (
    <Chip color={style.chipColor} variant="soft" size="md">
      <style.icon size={14} strokeWidth={2.5} />
      <Chip.Label>
        {style.label}
        {summary ? <span className="ml-1 text-xs opacity-80">({summary})</span> : null}
      </Chip.Label>
    </Chip>
  );
}

function BusRow({ bus }: { bus: BusHealth }) {
  const style = TONE_STYLES[busTone(bus.state)];
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-[10px] px-3 py-2 ${style.rowBg}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Cable size={14} strokeWidth={2.4} className="text-[color:var(--color-text-muted)]" />
        <span className="truncate font-mono text-sm font-semibold text-[color:var(--color-text)]">
          {bus.name}
        </span>
        <span className="font-mono text-xs text-[color:var(--color-text-muted)]">
          {bus.channel}
        </span>
      </div>
      <div className={`flex items-center gap-2 text-xs font-semibold ${style.rowText}`}>
        <Chip color={style.chipColor} variant="soft" size="sm">
          <Chip.Label>{style.label}</Chip.Label>
        </Chip>
        {bus.bus_off ? <span className="font-mono">bus_off</span> : null}
        {bus.tx_error_count > 0 ? (
          <span className="font-mono text-[color:var(--color-text-muted)]">
            tx_err {bus.tx_error_count}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function MotorRow({ motor }: { motor: MotorHealth }) {
  const style = TONE_STYLES[motorTone(motor.state)];
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-[10px] px-3 py-2 ${style.rowBg}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Cpu size={14} strokeWidth={2.4} className="text-[color:var(--color-text-muted)]" />
        <span className="truncate font-mono text-sm font-semibold text-[color:var(--color-text)]">
          {motor.name}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="font-mono text-[color:var(--color-text-muted)]">
          {formatAge(motor.feedback_age_ms)}
        </span>
        <span className="font-mono text-[color:var(--color-text-muted)]">
          {motor.temperature.toFixed(0)}℃
        </span>
        <Chip color={style.chipColor} variant="soft" size="sm">
          <Chip.Label>{motor.state.toUpperCase()}</Chip.Label>
        </Chip>
      </div>
    </div>
  );
}

function BusOnlyMode({ health }: { health: HealthSnapshot }) {
  const style = TONE_STYLES[busTone(health.overall)];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold tracking-wider text-[color:var(--color-text-subtle)] uppercase">
          CAN BUS
        </h3>
        <Chip color={style.chipColor} variant="soft" size="sm">
          <style.icon size={11} strokeWidth={2.5} />
          <Chip.Label>{style.label}</Chip.Label>
        </Chip>
      </div>
      {health.buses.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {health.buses.map((bus) => (
            <BusRow key={bus.name} bus={bus} />
          ))}
        </div>
      ) : (
        <div className="rounded-[10px] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-2 text-center text-[10px] text-[color:var(--color-text-muted)]">
          バス情報なし
        </div>
      )}
    </div>
  );
}

function CardMode({ health }: { health: HealthSnapshot }) {
  const style = TONE_STYLES[busTone(health.overall)];
  return (
    <Card variant="default" className="!gap-3 !p-4">
      <Card.Header className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-md ${style.rowBg} ${style.rowText}`}
          >
            <style.icon size={14} strokeWidth={2.5} />
          </span>
          <Card.Title className="text-sm font-bold tracking-tight">CAN ヘルス</Card.Title>
        </div>
        <Chip color={style.chipColor} variant="soft" size="md">
          <Chip.Label>{style.label}</Chip.Label>
        </Chip>
      </Card.Header>
      <Card.Content className="flex flex-col gap-3">
        {health.buses.length > 0 ? (
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold tracking-wider text-[color:var(--color-text-subtle)] uppercase">
              バス ({health.buses.length})
            </span>
            <div className="flex flex-col gap-1.5">
              {health.buses.map((bus) => (
                <BusRow key={bus.name} bus={bus} />
              ))}
            </div>
          </div>
        ) : null}

        {health.motors.length > 0 ? (
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold tracking-wider text-[color:var(--color-text-subtle)] uppercase">
              モータ ({health.motors.length})
            </span>
            <div className="flex flex-col gap-1.5">
              {health.motors.map((motor) => (
                <MotorRow key={motor.name} motor={motor} />
              ))}
            </div>
          </div>
        ) : null}
      </Card.Content>
    </Card>
  );
}

function NeutralPlaceholder({
  variant,
}: {
  variant: NonNullable<HealthIndicatorProps["variant"]>;
}) {
  const style = TONE_STYLES.neutral;
  if (variant === "pill") {
    return (
      <Chip color={style.chipColor} variant="soft" size="md">
        <Chip.Label>未取得</Chip.Label>
      </Chip>
    );
  }
  if (variant === "bus-only") {
    return (
      <div className="rounded-[10px] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-2 text-center text-[10px] text-[color:var(--color-text-muted)]">
        CAN ヘルス未取得
      </div>
    );
  }
  if (variant === "compact") {
    return (
      <Chip color={style.chipColor} variant="soft" size="md">
        <style.icon size={14} strokeWidth={2.5} />
        <Chip.Label>ヘルス情報未取得</Chip.Label>
      </Chip>
    );
  }
  return (
    <section
      aria-label="バスヘルス"
      className="rounded-[var(--radius-card)] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4 text-sm text-[color:var(--color-text-muted)]"
    >
      ヘルス情報未取得
    </section>
  );
}

export function HealthIndicator({ health, variant = "compact" }: HealthIndicatorProps) {
  if (!health) return <NeutralPlaceholder variant={variant} />;
  if (variant === "pill") return <PillMode health={health} />;
  if (variant === "compact") return <CompactMode health={health} />;
  if (variant === "bus-only") return <BusOnlyMode health={health} />;
  return <CardMode health={health} />;
}
