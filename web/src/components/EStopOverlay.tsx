import { AlertTriangle, RotateCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface EStopOverlayProps {
  active: boolean;
  onRelease: () => void;
}

const RELEASE_ANGLE = 90;
const SNAP_BACK_MS = 300;
const KNOB_SIZE = 224;
const RING_RADIUS = 102;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

export function EStopOverlay({ active, onRelease }: EStopOverlayProps) {
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const knobRef = useRef<HTMLDivElement>(null);
  const startAngleRef = useRef(0);
  const baseRotationRef = useRef(0);

  const getPointerAngle = useCallback((clientX: number, clientY: number) => {
    const el = knobRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      knobRef.current?.setPointerCapture(e.pointerId);
      setDragging(true);
      setSnapping(false);
      startAngleRef.current = getPointerAngle(e.clientX, e.clientY);
      baseRotationRef.current = rotation;
    },
    [getPointerAngle, rotation],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const current = getPointerAngle(e.clientX, e.clientY);
      let delta = current - startAngleRef.current;

      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;

      const newRotation = Math.max(0, Math.min(RELEASE_ANGLE, baseRotationRef.current + delta));
      setRotation(newRotation);

      if (newRotation >= RELEASE_ANGLE) {
        setDragging(false);
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate?.(120);
        }
        onRelease();
        setRotation(0);
      }
    },
    [dragging, getPointerAngle, onRelease],
  );

  const onPointerUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    setSnapping(true);
    setRotation(0);
    setTimeout(() => setSnapping(false), SNAP_BACK_MS);
  }, [dragging]);

  useEffect(() => {
    if (!active) {
      setRotation(0);
      setDragging(false);
      setSnapping(false);
    }
  }, [active]);

  if (!active) return null;

  const progress = rotation / RELEASE_ANGLE;
  const dashOffset = RING_CIRC * (1 - progress);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="緊急停止状態 — 解除するには回転してください"
      className="e-stop-overlay fixed inset-0 z-[99999] flex flex-col items-center justify-center px-6 text-center"
    >
      <div className="mb-10 flex flex-col items-center gap-3 select-none">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-[color:var(--color-danger)] shadow-2xl">
          <AlertTriangle size={36} strokeWidth={2.6} />
        </span>
        <h2 className="text-5xl font-black text-[color:var(--color-text)] drop-shadow md:text-6xl">
          緊急停止中
        </h2>
        <p className="text-base font-medium text-[color:var(--color-text-muted)] md:text-lg">
          ロボットの動作を即時停止しました
        </p>
      </div>

      <div className="relative">
        <span
          aria-hidden="true"
          className="e-stop-pulse-ring absolute inset-0 rounded-full bg-white/60"
        />
        <div
          ref={knobRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onContextMenu={(e) => e.preventDefault()}
          className="relative flex cursor-grab items-center justify-center select-none active:cursor-grabbing"
          style={{ width: KNOB_SIZE, height: KNOB_SIZE, touchAction: "none" }}
        >
          <svg
            aria-hidden="true"
            className="absolute inset-0 -rotate-90"
            width={KNOB_SIZE}
            height={KNOB_SIZE}
            viewBox={`0 0 ${KNOB_SIZE} ${KNOB_SIZE}`}
          >
            <circle
              cx={KNOB_SIZE / 2}
              cy={KNOB_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="6"
            />
            <circle
              cx={KNOB_SIZE / 2}
              cy={KNOB_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke="white"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={RING_CIRC}
              strokeDashoffset={dashOffset}
              style={{
                transition: snapping ? `stroke-dashoffset ${SNAP_BACK_MS}ms ease-out` : "none",
              }}
            />
          </svg>

          <div
            className="flex h-44 w-44 items-center justify-center rounded-full border-[6px] border-[oklch(35%_0.18_25)] bg-gradient-to-br from-[oklch(62%_0.22_25)] to-[oklch(48%_0.22_25)] shadow-2xl"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: snapping ? `transform ${SNAP_BACK_MS}ms ease-out` : "none",
            }}
          >
            <RotateCw size={56} strokeWidth={2.4} className="text-white" />
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col items-center gap-1 select-none">
        <p className="text-2xl font-extrabold text-[color:var(--color-text)] md:text-3xl">
          時計回りに 90° 回して解除
        </p>
        <p
          className="font-mono text-sm text-[color:var(--color-text-muted)] tabular-nums"
          aria-live="polite"
        >
          {Math.round(rotation)}° / {RELEASE_ANGLE}°
        </p>
      </div>
    </div>
  );
}
