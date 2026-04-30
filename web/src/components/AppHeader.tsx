import { Button, Drawer } from "@heroui/react";
import {
  Bot,
  LayoutDashboard,
  type LucideIcon,
  Maximize2,
  Menu,
  Minimize2,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

import { ConnectionStatus } from "@/components/ConnectionStatus";
import { EStopButton } from "@/components/EStopButton";

interface AppHeaderProps {
  title: string;
  connected: boolean;
  onEStop: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "ダッシュボード", icon: LayoutDashboard, end: true },
  { to: "/main-hand", label: "メインハンド", icon: Bot },
  { to: "/sub-hand", label: "サブハンド", icon: Bot },
  { to: "/motors", label: "モータ調整", icon: SlidersHorizontal },
];

export function AppHeader({ title, connected, onEStop }: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)]/85 px-4 py-3 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-3">
        <Button
          isIconOnly
          variant="outline"
          size="md"
          aria-label="メニューを開く"
          aria-expanded={menuOpen}
          onPress={() => setMenuOpen(true)}
        >
          <Menu size={20} />
        </Button>

        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <h1 className="truncate text-xl font-bold text-[color:var(--color-text)] md:text-2xl">
            {title}
          </h1>
        </div>

        <div className="hidden md:block">
          <ConnectionStatus connected={connected} />
        </div>

        <Button
          isIconOnly
          variant="outline"
          size="md"
          aria-label={isFullscreen ? "全画面解除" : "全画面表示"}
          onPress={toggleFullscreen}
          className="hidden md:!flex"
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </Button>

        <EStopButton onStop={onEStop} />
      </div>

      <div className="mt-2 flex items-center gap-2 md:hidden">
        <ConnectionStatus connected={connected} />
      </div>

      <Drawer>
        <Drawer.Backdrop isOpen={menuOpen} onOpenChange={setMenuOpen}>
          <Drawer.Content placement="left">
            <Drawer.Dialog className="bg-[color:var(--color-surface)]">
              <Drawer.Header className="border-b border-[color:var(--color-border)]">
                <div className="flex w-full items-center justify-between">
                  <Drawer.Heading className="text-lg font-bold text-[color:var(--color-text)]">
                    メニュー
                  </Drawer.Heading>
                  <Button
                    isIconOnly
                    variant="ghost"
                    size="sm"
                    aria-label="メニューを閉じる"
                    onPress={() => setMenuOpen(false)}
                  >
                    <X size={18} />
                  </Button>
                </div>
              </Drawer.Header>
              <Drawer.Body className="p-3">
                <nav className="flex flex-col gap-1">
                  {NAV_ITEMS.map(({ to, label, icon: ItemIcon, end }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-[10px] px-3 py-3 text-base font-medium transition ${
                          isActive
                            ? "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]"
                            : "text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-2)]"
                        }`
                      }
                    >
                      <ItemIcon size={18} />
                      <span>{label}</span>
                    </NavLink>
                  ))}
                  <div className="my-2 border-t border-[color:var(--color-border)]" />
                  <Button
                    variant="ghost"
                    fullWidth
                    onPress={() => {
                      toggleFullscreen();
                      setMenuOpen(false);
                    }}
                    className="!justify-start gap-3 !px-3 !py-3 text-base"
                  >
                    {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    <span>{isFullscreen ? "全画面解除" : "全画面表示"}</span>
                  </Button>
                </nav>
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </header>
  );
}
