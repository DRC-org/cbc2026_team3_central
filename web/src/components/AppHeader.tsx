import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ConnectionStatus } from "./ConnectionStatus";
import { EStopButton } from "./EStopButton";

interface AppHeaderProps {
  title: string;
  connected: boolean;
  onEStop: () => void;
}

export function AppHeader({ title, connected, onEStop }: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleClick);
    return () => document.removeEventListener("pointerdown", handleClick);
  }, []);

  const goTo = (path: string) => {
    navigate(path);
    setMenuOpen(false);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
    setMenuOpen(false);
  };

  return (
    <header className="flex items-center gap-4 border-b border-gray-200 bg-white px-4 py-3">
      {/* ハンバーガーメニュー */}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-2xl text-gray-600 hover:bg-gray-100"
          aria-label="メニュー"
        >
          ☰
        </button>
        {menuOpen && (
          <div className="absolute top-12 left-0 z-50 min-w-48 rounded-lg border border-gray-200 bg-white py-2 shadow-xl">
            {location.pathname !== "/" && (
              <button
                onClick={() => goTo("/")}
                className="w-full cursor-pointer px-4 py-3 text-left text-base hover:bg-gray-50"
              >
                📊 ダッシュボード
              </button>
            )}
            {location.pathname !== "/main-hand" && (
              <button
                onClick={() => goTo("/main-hand")}
                className="w-full cursor-pointer px-4 py-3 text-left text-base hover:bg-gray-50"
              >
                🤖 メインハンド
              </button>
            )}
            {location.pathname !== "/sub-hand" && (
              <button
                onClick={() => goTo("/sub-hand")}
                className="w-full cursor-pointer px-4 py-3 text-left text-base hover:bg-gray-50"
              >
                🤖 サブハンド
              </button>
            )}
            <div className="mx-3 my-1 border-t border-gray-100" />
            {location.pathname !== "/motors" && (
              <button
                onClick={() => goTo("/motors")}
                className="w-full cursor-pointer px-4 py-3 text-left text-base text-gray-500 hover:bg-gray-50"
              >
                🔧 モータ詳細・調整
              </button>
            )}
            <button
              onClick={toggleFullscreen}
              className="w-full cursor-pointer px-4 py-3 text-left text-base text-gray-500 hover:bg-gray-50"
            >
              ⛶ 全画面表示
            </button>
          </div>
        )}
      </div>

      {/* タイトル */}
      <h1 className="flex-1 text-2xl font-black text-gray-900">{title}</h1>

      {/* 接続状態 */}
      <ConnectionStatus connected={connected} />

      {/* 緊急停止 */}
      <EStopButton onStop={onEStop} />
    </header>
  );
}
