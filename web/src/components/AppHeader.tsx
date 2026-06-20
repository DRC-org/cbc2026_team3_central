import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { ConnectionStatus } from "@/components/ConnectionStatus";
import { EStopButton } from "@/components/EStopButton";
import { TuiButton, TuiNav, type TuiNavItem } from "@/components/tui";
import {
  Position,
  TuiDatetime,
  TuiDropdown,
  TuiMenuItem,
  TuiNavbar,
  TuiSidenav,
} from "react-tuicss";

interface AppHeaderProps {
  connected: boolean;
  onEStop: () => void;
}

// タブ型ナビ定義。key=ルートパス。ラベルは TUI 流の大文字＋区切り記号で。
const NAV_ITEMS: TuiNavItem[] = [
  { key: "/", label: "DASHBOARD" },
  { key: "/main-hand", label: "MAIN HAND" },
  { key: "/sub-hand", label: "SUB HAND" },
  { key: "/motors", label: "MOTORS" },
];

export function AppHeader({ connected, onEStop }: AppHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
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

  // return (
  //   <header className="tui-topbar">
  //     <TuiNav
  //       items={NAV_ITEMS}
  //       activeKey={location.pathname}
  //       onSelect={(key) => navigate(key)}
  //       fixed={false}
  //     />

  //     <div className="tui-topbar-aside">
  //       <ConnectionStatus connected={connected} />
  //       <TuiButton
  //         flat
  //         onPress={toggleFullscreen}
  //       >
  //         {isFullscreen ? "[ ▣ ]" : "[ ⛶ ]"}
  //       </TuiButton>
  //       <EStopButton onStop={onEStop} />
  //     </div>
  //   </header>
  // );

  return (
    <TuiNavbar
      sidenav={
        <TuiSidenav>
          <TuiMenuItem href="#!">
            <span className="red-168-text">O</span>pen
            <span className="tui-shortcut">ctrl+o</span>
          </TuiMenuItem>
          <TuiMenuItem href="#!">OS Shell</TuiMenuItem>
          <TuiMenuItem href="#!">
            <span className="red-168-text">C</span>opy
            <span className="tui-shortcut">ctrl+c</span>
          </TuiMenuItem>
          <TuiMenuItem href="#!">
            <span className="red-168-text">P</span>aste
            <span className="tui-shortcut">ctrl+v</span>
          </TuiMenuItem>
          <TuiMenuItem href="#!">
            Cut
            <span className="tui-shortcut">ctrl+x</span>
          </TuiMenuItem>
          <div className="tui-black-divider"></div>
          <TuiMenuItem href="#!">Insert</TuiMenuItem>
          <TuiMenuItem href="#!">Delete</TuiMenuItem>
          <TuiMenuItem href="#!">Go...</TuiMenuItem>
          <div className="tui-black-divider"></div>
          <TuiMenuItem href="#!">
            <span className="red-168-text">S</span>earch
            <span className="tui-shortcut">ctrl+p</span>
          </TuiMenuItem>
          <div className="tui-black-divider"></div>
          <TuiMenuItem href="#!">
            Exit <span className="tui-shortcut">F10</span>
          </TuiMenuItem>
        </TuiSidenav>
      }
    >
      <TuiDropdown
        dropDownLabel={
          <div>
            <span className="red-168-text">F</span>ile
          </div>
        }
      >
        <TuiMenuItem onClick={() => {}}>
          <span className="red-168-text">N</span>ew
        </TuiMenuItem>
        <TuiMenuItem href="#!">
          <span className="red-168-text">O</span>pen...
          <span className="tui-shortcut">F3</span>
        </TuiMenuItem>
        <TuiMenuItem href="#!">
          <span className="red-168-text">S</span>ave
          <span className="tui-shortcut">F2</span>
        </TuiMenuItem>
        <TuiMenuItem href="#!">
          S<span className="red-168-text">a</span>ve as...
        </TuiMenuItem>
        <TuiMenuItem href="#!">
          Save a<span className="red-168-text">l</span>l
        </TuiMenuItem>
        <div className="tui-black-divider"></div>

        <TuiDropdown
          block={true}
          dropDownLabel={
            <div>
              <span className="right">►</span>
              <span className="red-168-text">M</span>ore
            </div>
          }
        >
          <TuiMenuItem href="#!">
            <span className="red-168-text">C</span>hange dir...
          </TuiMenuItem>
          <TuiMenuItem href="#!">
            <span className="red-168-text">P</span>rint
          </TuiMenuItem>
          <TuiMenuItem href="#!">
            <span className="red-168-text">D</span>OS shell
          </TuiMenuItem>
        </TuiDropdown>

        <div className="tui-black-divider"></div>
        <TuiMenuItem href="#!">
          <span className="red-168-text">Q</span>uit
          <span className="tui-shortcut">F10</span>
        </TuiMenuItem>
      </TuiDropdown>
      <TuiMenuItem onClick={() => navigate("/")}>
        <span className="red-168-text">M</span>onitor
      </TuiMenuItem>
      <TuiMenuItem onClick={() => navigate("/main-hand")}>
        M<span className="red-168-text">a</span>in Hand
      </TuiMenuItem>

      <TuiDatetime format="yyyy-MM-dd hh:mm:ss " />
    </TuiNavbar>
  );
}
