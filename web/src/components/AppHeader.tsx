import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button, Drawer } from "@heroui/react";
import { ConnectionStatus } from "./ConnectionStatus";
import { EStopButton } from "./EStopButton";

interface AppHeaderProps {
  title: string;
  connected: boolean;
  onEStop: () => void;
}

export function AppHeader({ title, connected, onEStop }: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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
      <Drawer>
        <Drawer.Trigger>
          <Button
            variant="ghost"
            isIconOnly
            aria-label="メニュー"
            onPress={() => setMenuOpen(true)}
            className="text-2xl text-gray-600"
          >
            ☰
          </Button>
        </Drawer.Trigger>
        <Drawer.Backdrop isOpen={menuOpen} onOpenChange={setMenuOpen}>
          <Drawer.Content placement="left">
            <Drawer.Dialog>
              <Drawer.Header>
                <Drawer.Heading>メニュー</Drawer.Heading>
                <Drawer.CloseTrigger />
              </Drawer.Header>
              <Drawer.Body>
                <div className="flex flex-col gap-1">
                  {location.pathname !== "/" && (
                    <Button variant="ghost" fullWidth onPress={() => goTo("/")}>
                      📊 ダッシュボード
                    </Button>
                  )}
                  {location.pathname !== "/main-hand" && (
                    <Button variant="ghost" fullWidth onPress={() => goTo("/main-hand")}>
                      🤖 メインハンド
                    </Button>
                  )}
                  {location.pathname !== "/sub-hand" && (
                    <Button variant="ghost" fullWidth onPress={() => goTo("/sub-hand")}>
                      🤖 サブハンド
                    </Button>
                  )}
                  <div className="mx-3 my-1 border-t border-gray-100" />
                  {location.pathname !== "/motors" && (
                    <Button variant="ghost" fullWidth onPress={() => goTo("/motors")}>
                      🔧 モータ詳細・調整
                    </Button>
                  )}
                  <Button variant="ghost" fullWidth onPress={toggleFullscreen}>
                    ⛶ 全画面表示
                  </Button>
                </div>
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>

      <h1 className="flex-1 text-2xl font-black text-gray-900">{title}</h1>

      <ConnectionStatus connected={connected} />

      <EStopButton onStop={onEStop} />
    </header>
  );
}
