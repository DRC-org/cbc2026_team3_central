import { Activity, AlertTriangle, CheckCircle2, Cable, Cpu, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type {
  BusHealth,
  BusHealthState,
  HealthSnapshot,
  MotorHealth,
  MotorHealthState,
} from "../hooks/useRobotSocket";
import { Icon } from "./Icon";

interface HealthIndicatorProps {
  health: HealthSnapshot | undefined;
  variant?: "pill" | "card" | "compact";
}

type Tone = "success" | "warning" | "danger" | "neutral";

interface ToneStyle {
  label: string;
  icon: LucideIcon;
  text: string;
  bg: string;
  ring: string;
  dot: string;
}

const TONE_STYLES: Record<Tone, ToneStyle> = {
  success: {
    label: "OK",
    icon: CheckCircle2,
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    ring: "ring-emerald-500/40",
    dot: "bg-emerald-500",
  },
  warning: {
    label: "DEGRADED",
    icon: AlertTriangle,
    text: "text-amber-700",
    bg: "bg-amber-50",
    ring: "ring-amber-500/40",
    dot: "bg-amber-500",
  },
  danger: {
    label: "DOWN",
    icon: XCircle,
    text: "text-red-700",
    bg: "bg-red-50",
    ring: "ring-red-500/40",
    dot: "bg-red-500",
  },
  neutral: {
    label: "未取得",
    icon: Activity,
    text: "text-[color:var(--color-text-muted)]",
    bg: "bg-[color:var(--color-surface-2)]",
    ring: "ring-[color:var(--color-border)]",
    dot: "bg-[color:var(--color-text-subtle)]",
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

// サーバー時計と乖離する Date.now() ではなく、サーバーが計算した経過 ms をそのまま整形する
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

interface PillModeProps {
  health: HealthSnapshot;
}

function PillMode({ health }: PillModeProps) {
  const tone = busTone(health.overall);
  const style = TONE_STYLES[tone];
  const summary = buildSummary(health);
  const tooltip =
    summary.length > 0
      ? `${style.label}: ${summary}`
      : `${style.label} (バス ${health.buses.length} / モータ ${health.motors.length})`;

  return (
    <span
      role="status"
      aria-label={`ヘルス ${style.label}`}
      title={tooltip}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${style.bg} ${style.text} ${style.ring}`}
    >
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

interface CompactModeProps {
  health: HealthSnapshot;
}

function CompactMode({ health }: CompactModeProps) {
  const tone = busTone(health.overall);
  const style = TONE_STYLES[tone];
  const summary = buildSummary(health);
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-[10px] px-3 py-1.5 text-sm font-medium ring-1 ${style.bg} ${style.text} ${style.ring}`}
    >
      <Icon icon={style.icon} size={16} strokeWidth={2.5} />
      <span className="font-bold">{style.label}</span>
      {summary ? <span className="text-xs opacity-80">({summary})</span> : null}
    </div>
  );
}

interface BusRowProps {
  bus: BusHealth;
}

function BusRow({ bus }: BusRowProps) {
  const tone = busTone(bus.state);
  const style = TONE_STYLES[tone];
  return (
    <div className={`flex items-center justify-between gap-3 rounded-[10px] px-3 py-2 ${style.bg}`}>
      <div className="flex min-w-0 items-center gap-2">
        <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
        <Icon
          icon={Cable}
          size={14}
          strokeWidth={2.4}
          className="text-[color:var(--color-text-muted)]"
        />
        <span className="truncate font-mono text-sm font-semibold text-[color:var(--color-text)]">
          {bus.name}
        </span>
        <span className="font-mono text-xs text-[color:var(--color-text-muted)]">
          {bus.channel}
        </span>
      </div>
      <div className={`flex items-center gap-2 text-xs font-semibold ${style.text}`}>
        <span>{style.label}</span>
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

interface MotorRowProps {
  motor: MotorHealth;
}

function MotorRow({ motor }: MotorRowProps) {
  const tone = motorTone(motor.state);
  const style = TONE_STYLES[tone];
  return (
    <div className={`flex items-center justify-between gap-3 rounded-[10px] px-3 py-2 ${style.bg}`}>
      <div className="flex min-w-0 items-center gap-2">
        <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
        <Icon
          icon={Cpu}
          size={14}
          strokeWidth={2.4}
          className="text-[color:var(--color-text-muted)]"
        />
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
        <span className={`font-semibold ${style.text}`}>{motor.state.toUpperCase()}</span>
      </div>
    </div>
  );
}

interface CardModeProps {
  health: HealthSnapshot;
}

function CardMode({ health }: CardModeProps) {
  const tone = busTone(health.overall);
  const style = TONE_STYLES[tone];
  return (
    <section
      aria-label="バスヘルス"
      className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4"
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-md ${style.bg} ${style.text}`}
          >
            <Icon icon={style.icon} size={14} strokeWidth={2.5} />
          </span>
          <h3 className="text-sm font-bold tracking-tight text-[color:var(--color-text)]">
            CAN ヘルス
          </h3>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${style.bg} ${style.text} ${style.ring}`}
        >
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${style.dot}`} />
          {style.label}
        </span>
      </header>

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
    </section>
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
      <span
        role="status"
        aria-label="ヘルス未取得"
        title="ヘルス情報未取得"
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${style.bg} ${style.text} ${style.ring}`}
      >
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${style.dot}`} />
        未取得
      </span>
    );
  }
  if (variant === "compact") {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-[10px] px-3 py-1.5 text-sm font-medium ring-1 ${style.bg} ${style.text} ${style.ring}`}
      >
        <Icon icon={style.icon} size={16} strokeWidth={2.5} />
        ヘルス情報未取得
      </div>
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
  return <CardMode health={health} />;
}
