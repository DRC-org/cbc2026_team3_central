import type { CSSProperties } from "react";

interface SequenceProgressProps {
  sequence: string;
  currentStep: string | null;
  stepIndex: number;
  totalSteps: number;
  waitingTrigger: boolean;
}

const containerStyle: CSSProperties = {
  padding: 16,
  backgroundColor: "#16213e",
  borderRadius: 8,
  marginBottom: 16,
};

const barContainerStyle: CSSProperties = {
  display: "flex",
  gap: 4,
  marginTop: 12,
};

export function SequenceProgress({
  sequence,
  currentStep,
  stepIndex,
  totalSteps,
  waitingTrigger,
}: SequenceProgressProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i);

  return (
    <div style={containerStyle}>
      <div style={{ fontSize: 14, color: "#aaa" }}>
        シーケンス: <strong style={{ color: "#eee" }}>{sequence}</strong>
      </div>
      <div style={{ fontSize: 16, marginTop: 4, color: "#eee" }}>
        {currentStep ?? "---"}
        {waitingTrigger && (
          <span
            style={{
              marginLeft: 12,
              color: "#facc15",
              animation: "blink 1s step-end infinite",
            }}
          >
            ● 待機中
          </span>
        )}
      </div>
      <div style={barContainerStyle}>
        {steps.map((i) => {
          let bg = "#333";
          if (i < stepIndex) bg = "#16a34a";
          else if (i === stepIndex) bg = waitingTrigger ? "#facc15" : "#3b82f6";
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: 8,
                borderRadius: 4,
                backgroundColor: bg,
                transition: "background-color 0.3s",
              }}
            />
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
        ステップ {stepIndex + 1} / {totalSteps}
      </div>
      <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
    </div>
  );
}
