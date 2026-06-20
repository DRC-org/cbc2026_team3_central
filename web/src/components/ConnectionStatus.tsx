import { cx } from "@/components/tui/types";

interface ConnectionStatusProps {
  connected: boolean;
  className?: string;
}

// WebSocket 接続状態を等幅記号で表す。緑●=接続 / 赤○=切断（再接続中は点滅）。
export function ConnectionStatus({ connected, className }: ConnectionStatusProps) {
  return (
    <span className={cx("inline-flex items-center gap-1", className)}>
      <span
        aria-hidden="true"
        className={cx(
          connected ? "success-text" : "danger-text",
          !connected && "connection-dot-pulse",
        )}
      >
        {connected ? "●" : "○"}
      </span>
      <span>{connected ? "CONNECTED" : "RECONNECTING"}</span>
    </span>
  );
}
