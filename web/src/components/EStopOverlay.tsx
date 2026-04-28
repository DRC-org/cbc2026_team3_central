import { useCallback, useEffect, useRef, useState } from "react";

interface EStopOverlayProps {
  active: boolean;
  onRelease: () => void;
}

const HOLD_DURATION = 3000;
const CIRCLE_RADIUS = 54;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

export function EStopOverlay({ active, onRelease }: EStopOverlayProps) {
  const [pressing, setPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const cancelHold = useCallback(() => {
    setPressing(false);
    setProgress(0);
    cancelAnimationFrame(rafRef.current);
  }, []);

  const tick = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current;
    const p = Math.min(elapsed / HOLD_DURATION, 1);
    setProgress(p);

    if (p >= 1) {
      cancelHold();
      onRelease();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [onRelease, cancelHold]);

  const startHold = useCallback(() => {
    setPressing(true);
    startTimeRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  if (!active) return null;

  const strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - progress);
  const seconds = Math.ceil(HOLD_DURATION / 1000 * (1 - progress));

  return (
    <div className="e-stop-overlay fixed inset-0 z-[99999] flex flex-col items-center justify-center">
      <p className="mb-8 text-6xl font-black text-gray-900 drop-shadow-lg">
        ⚠ 緊急停止中
      </p>

      <div className="relative flex flex-col items-center">
        <svg width="140" height="140" className="rotate-[-90deg]">
          <circle
            cx="70"
            cy="70"
            r={CIRCLE_RADIUS}
            fill="none"
            stroke="#d1d5db"
            strokeWidth="8"
          />
          <circle
            cx="70"
            cy="70"
            r={CIRCLE_RADIUS}
            fill="none"
            stroke="#2563eb"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCLE_CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            className="transition-none"
          />
        </svg>
        <button
          onPointerDown={startHold}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
          onContextMenu={(e) => e.preventDefault()}
          className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full text-center text-lg font-bold text-gray-900 select-none"
        >
          {pressing ? `解除中... (${seconds}s)` : "長押しで解除"}
        </button>
      </div>
    </div>
  );
}
