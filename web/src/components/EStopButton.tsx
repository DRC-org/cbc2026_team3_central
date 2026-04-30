interface EStopButtonProps {
  onStop: () => void;
}

export function EStopButton({ onStop }: EStopButtonProps) {
  return (
    <div className="e-stop-stripe flex shrink-0 items-center justify-center rounded-[10px] p-[3px]">
      <button
        type="button"
        onClick={onStop}
        aria-label="緊急停止"
        className="flex h-12 items-center gap-2 rounded-[7px] bg-[color:var(--color-danger)] px-4 text-sm font-black tracking-wider text-white shadow-[0_2px_6px_rgba(0,0,0,0.18)] transition hover:bg-[oklch(52%_0.24_25)] focus-visible:ring-4 focus-visible:ring-[color:var(--color-danger)]/40 focus-visible:outline-none active:translate-y-px"
      >
        <span>EMG STOP</span>
      </button>
    </div>
  );
}
