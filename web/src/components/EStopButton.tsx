import type { CSSProperties } from "react";

interface EStopButtonProps {
  onStop: () => void;
}

const style: CSSProperties = {
  position: "fixed",
  bottom: 32,
  right: 32,
  width: 96,
  height: 96,
  borderRadius: "50%",
  backgroundColor: "#dc2626",
  color: "#fff",
  fontSize: 14,
  fontWeight: 700,
  border: "4px solid #991b1b",
  cursor: "pointer",
  boxShadow: "0 0 24px rgba(220, 38, 38, 0.6)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  userSelect: "none",
};

export function EStopButton({ onStop }: EStopButtonProps) {
  return (
    <button style={style} onClick={onStop} title="緊急停止">
      E-STOP
    </button>
  );
}
