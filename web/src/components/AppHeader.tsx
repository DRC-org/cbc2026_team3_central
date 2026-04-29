import { Drawer } from "@heroui/react";
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

import { ConnectionStatus } from "./ConnectionStatus";
import { EStopButton } from "./EStopButton";
import { Icon } from "./Icon";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
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

export function AppHeader({ title, subtitle, connected, onEStop }: AppHeaderProps) {
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
        <button
          type="button"
          aria-label="メニューを開く"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] transition hover:bg-[color:var(--color-surface-2)] focus-visible:ring-4 focus-visible:ring-[color:var(--color-accent)]/30 focus-visible:outline-none"
        >
          <Icon icon={Menu} size={20} />
        </button>

        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <h1 className="truncate text-xl font-bold text-[color:var(--color-text)] md:text-2xl">
            {title}
          </h1>
          {subtitle ? (
            <span className="truncate text-xs font-medium text-[color:var(--color-text-muted)] md:text-sm">
              {subtitle}
            </span>
          ) : null}
        </div>

        <div className="hidden md:block">
          <ConnectionStatus connected={connected} />
        </div>

        <button
          type="button"
          aria-label={isFullscreen ? "全画面解除" : "全画面表示"}
          onClick={toggleFullscreen}
          className="hidden h-10 w-10 items-center justify-center rounded-[10px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text-muted)] transition hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-text)] focus-visible:ring-4 focus-visible:ring-[color:var(--color-accent)]/30 focus-visible:outline-none md:flex"
        >
          <Icon icon={isFullscreen ? Minimize2 : Maximize2} size={18} />
        </button>

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
                  <button
                    type="button"
                    aria-label="メニューを閉じる"
                    onClick={() => setMenuOpen(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-surface-2)]"
                  >
                    <Icon icon={X} size={18} />
                  </button>
                </div>
              </Drawer.Header>
              <Drawer.Body className="p-3">
                <nav className="flex flex-col gap-1">
                  {NAV_ITEMS.map(({ to, label, icon, end }) => (
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
                      <Icon icon={icon} size={18} />
                      <span>{label}</span>
                    </NavLink>
                  ))}
                  <div className="my-2 border-t border-[color:var(--color-border)]" />
                  <button
                    type="button"
                    onClick={() => {
                      toggleFullscreen();
                      setMenuOpen(false);
                    }}
                    className="flex items-center gap-3 rounded-[10px] px-3 py-3 text-base font-medium text-[color:var(--color-text)] transition hover:bg-[color:var(--color-surface-2)]"
                  >
                    <Icon icon={isFullscreen ? Minimize2 : Maximize2} size={18} />
                    <span>{isFullscreen ? "全画面解除" : "全画面表示"}</span>
                  </button>
                </nav>
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </header>
  );
}
