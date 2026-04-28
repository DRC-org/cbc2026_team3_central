import type { CSSProperties } from "react";

interface TriggerButtonProps {
  waiting: boolean;
  onTrigger: () => void;
}

const baseStyle: CSSProperties = {
  padding: "16px 48px",
  fontSize: 18,
  fontWeight: 700,
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  transition: "background-color 0.2s",
};

export function TriggerButton({ waiting, onTrigger }: TriggerButtonProps) {
  const style: CSSProperties = {
    ...baseStyle,
    backgroundColor: waiting ? "#16a34a" : "#444",
    color: waiting ? "#fff" : "#888",
    cursor: waiting ? "pointer" : "not-allowed",
    boxShadow: waiting ? "0 0 12px rgba(22, 163, 74, 0.5)" : "none",
  };

  return (
    <button style={style} disabled={!waiting} onClick={onTrigger}>
      {waiting ? "次へ進む ▶" : "実行中..."}
    </button>
  );
}
