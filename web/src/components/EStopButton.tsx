interface EStopButtonProps {
  onStop: () => void;
}

export function EStopButton({ onStop }: EStopButtonProps) {
  return (
    <div className="e-stop-stripe flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-md p-1">
      <button
        onClick={onStop}
        title="緊急停止"
        className="flex h-full w-full cursor-pointer items-center justify-center rounded border-2 border-red-900 bg-red-600 text-xs font-black leading-tight text-white hover:bg-red-700 active:bg-red-800"
      >
        EMG<br />STOP
      </button>
    </div>
  );
}
