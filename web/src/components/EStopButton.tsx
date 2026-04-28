interface EStopButtonProps {
  onStop: () => void;
}

export function EStopButton({ onStop }: EStopButtonProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999]">
      <div className="e-stop-stripe p-2">
        <button
          onClick={onStop}
          className="flex w-full cursor-pointer items-center justify-center rounded-lg border-4 border-red-900 bg-red-600 py-5 text-2xl font-black tracking-widest text-white shadow-lg hover:bg-red-700 active:bg-red-800"
        >
          ◆ 緊急停止 ◆
        </button>
      </div>
    </div>
  );
}
