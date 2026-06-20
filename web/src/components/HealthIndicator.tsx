import { cx } from "@/components/tui";
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

interface ToneStyle {
  label: string;
  symbol: string;
  // TuiCss セマンティック text クラス。
  textClass: string;
}

const TONE_STYLES: Record<Tone, ToneStyle> = {
  success: { label: "OK", symbol: "✓", textClass: "success-text" },
  warning: { label: "DEGRADED", symbol: "⚠", textClass: "warning-text" },
  danger: { label: "DOWN", symbol: "✗", textClass: "danger-text" },
  neutral: { label: "未取得", symbol: "○", textClass: "secondary-text" },
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

// 状態バッジ（[記号 ラベル]）。色は TuiCss text クラスで付与。
function StatusTag({ tone, extra }: { tone: Tone; extra?: string }) {
  const style = TONE_STYLES[tone];
  return (
    <span className={cx("whitespace-nowrap font-bold", style.textClass)}>
      [{style.symbol} {style.label}
      {extra ? ` ${extra}` : ""}]
    </span>
  );
}

function PillMode({ health }: { health: HealthSnapshot }) {
  const tone = busTone(health.overall);
  const summary = buildSummary(health);
  const tooltip =
    summary.length > 0
      ? `${TONE_STYLES[tone].label}: ${summary}`
      : `${TONE_STYLES[tone].label} (バス ${health.buses.length} / モータ ${health.motors.length})`;
  return (
    <span title={tooltip} role="status" aria-label={`ヘルス ${TONE_STYLES[tone].label}`}>
      <StatusTag tone={tone} />
    </span>
  );
}

function CompactMode({ health }: { health: HealthSnapshot }) {
  const tone = busTone(health.overall);
  const summary = buildSummary(health);
  return <StatusTag tone={tone} extra={summary ? `(${summary})` : undefined} />;
}

function BusRow({ bus }: { bus: BusHealth }) {
  const style = TONE_STYLES[busTone(bus.state)];
  return (
    <div className="flex items-center justify-between gap-3 px-1 py-1">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate font-bold">{bus.name}</span>
        <span className="text-xs opacity-60">{bus.channel}</span>
      </div>
      <div className={cx("flex items-center gap-2 text-xs font-bold", style.textClass)}>
        <span>
          {style.symbol} {style.label}
        </span>
        {bus.bus_off ? <span>bus_off</span> : null}
        {bus.tx_error_count > 0 ? (
          <span className="opacity-80">tx_err {bus.tx_error_count}</span>
        ) : null}
      </div>
    </div>
  );
}

function MotorRow({ motor }: { motor: MotorHealth }) {
  const style = TONE_STYLES[motorTone(motor.state)];
  return (
    <div className="flex items-center justify-between gap-3 px-1 py-1">
      <span className="min-w-0 truncate font-bold">{motor.name}</span>
      <div className="flex items-center gap-3 text-xs">
        <span className="opacity-70">{formatAge(motor.feedback_age_ms)}</span>
        <span className="opacity-70">{motor.temperature.toFixed(0)}℃</span>
        <span className={cx("font-bold", style.textClass)}>{motor.state.toUpperCase()}</span>
      </div>
    </div>
  );
}

function BusOnlyMode({ health }: { health: HealthSnapshot }) {
  const tone = busTone(health.overall);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold tracking-wider opacity-80">CAN BUS</h3>
        <StatusTag tone={tone} />
      </div>
      {health.buses.length > 0 ? (
        <div className="flex flex-col">
          {health.buses.map((bus) => (
            <BusRow key={bus.name} bus={bus} />
          ))}
        </div>
      ) : (
        <div className="p-1 text-xs opacity-60">バス情報なし</div>
      )}
    </div>
  );
}

function CardMode({ health }: { health: HealthSnapshot }) {
  const tone = busTone(health.overall);
  return (
    <fieldset className="tui-fieldset">
      <legend>CAN ヘルス</legend>
      <div className="flex flex-col gap-3 px-1 py-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">STATUS</span>
          <StatusTag tone={tone} />
        </div>
        {health.buses.length > 0 ? (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold tracking-wider opacity-70">
              バス ({health.buses.length})
            </span>
            {health.buses.map((bus) => (
              <BusRow key={bus.name} bus={bus} />
            ))}
          </div>
        ) : null}
        {health.motors.length > 0 ? (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold tracking-wider opacity-70">
              モータ ({health.motors.length})
            </span>
            {health.motors.map((motor) => (
              <MotorRow key={motor.name} motor={motor} />
            ))}
          </div>
        ) : null}
      </div>
    </fieldset>
  );
}

function NeutralPlaceholder({
  variant,
}: {
  variant: NonNullable<HealthIndicatorProps["variant"]>;
}) {
  if (variant === "pill" || variant === "compact") {
    return <StatusTag tone="neutral" />;
  }
  if (variant === "bus-only") {
    return (
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold tracking-wider opacity-80">CAN BUS</h3>
        <span className="text-xs opacity-60">CAN ヘルス未取得</span>
      </div>
    );
  }
  return (
    <fieldset className="tui-fieldset">
      <legend>CAN ヘルス</legend>
      <p className="px-1 py-1 text-sm opacity-70">ヘルス情報未取得</p>
    </fieldset>
  );
}

export function HealthIndicator({ health, variant = "compact" }: HealthIndicatorProps) {
  if (!health) return <NeutralPlaceholder variant={variant} />;
  if (variant === "pill") return <PillMode health={health} />;
  if (variant === "compact") return <CompactMode health={health} />;
  if (variant === "bus-only") return <BusOnlyMode health={health} />;
  return <CardMode health={health} />;
}
