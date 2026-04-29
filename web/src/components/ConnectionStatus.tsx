import { StatusDot } from "./StatusDot";

interface ConnectionStatusProps {
  connected: boolean;
}

export function ConnectionStatus({ connected }: ConnectionStatusProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1.5"
    >
      <StatusDot tone={connected ? "success" : "danger"} pulse={!connected} />
      <span className="text-sm font-semibold text-[color:var(--color-text)]">
        {connected ? "接続中" : "再接続中..."}
      </span>
    </div>
  );
}
