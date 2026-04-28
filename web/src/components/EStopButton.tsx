interface EStopButtonProps {
  onStop: () => void;
}

export function EStopButton({ onStop }: EStopButtonProps) {
  return (
    <div className="fixed bottom-8 right-8 z-[9999]">
      <div className="e-stop-border">
        <button
          onClick={onStop}
          title="緊急停止"
          className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-full border-4 border-red-900 bg-red-600 text-sm font-bold text-white shadow-lg hover:bg-red-700 active:bg-red-800"
          style={{ animation: "pulse-glow 2s ease-in-out infinite" }}
        >
          <span className="text-center leading-tight">
            <span className="block text-2xl">&#x26A0;</span>
            <span className="block text-xs">緊急停止</span>
          </span>
        </button>
      </div>
    </div>
  );
}
