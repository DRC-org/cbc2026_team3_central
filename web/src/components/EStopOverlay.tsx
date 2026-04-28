import { useCallback, useEffect, useRef, useState } from "react";

interface EStopOverlayProps {
  active: boolean;
  onRelease: () => void;
}

const RELEASE_ANGLE = 90;
const SNAP_BACK_MS = 300;

export function EStopOverlay({ active, onRelease }: EStopOverlayProps) {
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const knobRef = useRef<HTMLDivElement>(null);
  const startAngleRef = useRef(0);
  const baseRotationRef = useRef(0);

  const getPointerAngle = useCallback(
    (clientX: number, clientY: number) => {
      const el = knobRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
    },
    [],
  );

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

      // -180/180 の境界をまたいだ時の補正
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;

      // 時計回りのみ有効（0〜RELEASE_ANGLE にクランプ）
      const newRotation = Math.max(0, Math.min(RELEASE_ANGLE, baseRotationRef.current + delta));
      setRotation(newRotation);

      if (newRotation >= RELEASE_ANGLE) {
        setDragging(false);
        onRelease();
        setRotation(0);
      }
    },
    [dragging, getPointerAngle, onRelease],
  );

  const onPointerUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    // バネのように 0° に戻る
    setSnapping(true);
    setRotation(0);
    setTimeout(() => setSnapping(false), SNAP_BACK_MS);
  }, [dragging]);

  // active が false になったらリセット
  useEffect(() => {
    if (!active) {
      setRotation(0);
      setDragging(false);
      setSnapping(false);
    }
  }, [active]);

  if (!active) return null;

  return (
    <div className="e-stop-overlay fixed inset-0 z-[99999] flex flex-col items-center justify-center">
      <p className="mb-12 text-6xl font-black text-gray-900 drop-shadow-lg select-none">
        ⚠ 緊急停止中
      </p>

      <div
        ref={knobRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
        className="relative flex cursor-grab select-none items-center justify-center active:cursor-grabbing"
        style={{ touchAction: "none" }}
      >
        {/* ノブ本体 */}
        <div
          className="flex h-48 w-48 items-center justify-center rounded-full border-8 border-red-900 bg-red-600 shadow-2xl"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: snapping ? `transform ${SNAP_BACK_MS}ms ease-out` : "none",
          }}
        >
          {/* 矢印マーク（回転方向ガイド） */}
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <path
              d="M40 16 A24 24 0 1 1 16 40"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <polygon points="18,28 8,40 22,44" fill="white" />
          </svg>
        </div>
      </div>

      <p className="mt-8 text-2xl font-bold text-gray-800 select-none">
        回して解除
      </p>
    </div>
  );
}
