import { useCallback } from "react";
import { TuiTabs } from "react-tuicss";

import { RobotProvider } from "@/context/RobotContext";
import { useRobotSocket } from "@/hooks/useRobotSocket";
import { Dashboard } from "@/pages/Dashboard";
import { MotorTuning } from "@/pages/MotorTuning";
import { RobotControl } from "@/pages/RobotControl";

export function App() {
  const socket = useRobotSocket();

  const onEStop = useCallback(() => {
    socket.send({ type: "e_stop" });
    socket.setEStopActive(true);
  }, [socket]);

  const onEStopRelease = useCallback(() => {
    socket.send({ type: "e_stop_release" });
    socket.setEStopActive(false);
  }, [socket]);

  return (
    <RobotProvider
      value={{
        states: socket.states,
        connected: socket.connected,
        eStopActive: socket.eStopActive,
        healthEvents: socket.healthEvents,
        motorChecks: socket.motorChecks,
        send: socket.send,
        onEStop,
        onEStopRelease,
      }}
    >
      <div className="wrapper white-168">
        <div className="tui-panel full-width center cyan-168 black-255-text tui-no-shadow">
          cbc2026_team3_controller
        </div>
        <TuiTabs
          tabs={[
            { tabTitle: "Monitor", tab: <Dashboard /> },
            {
              tabTitle: "Main Hand",
              tab: <RobotControl robotKey="main_hand" label="メインハンド" />,
            },
            {
              tabTitle: "Sub Hand",
              tab: <RobotControl robotKey="sub_hand" label="サブハンド" />,
            },
            { tabTitle: "PID Tuning", tab: <MotorTuning /> },
          ]}
        />
        <div className="tui-statusbar cyan-168 absolute">
          <ul>
            <li>
              {socket.connected ? (
                <>
                  <span className="green-255-text">●</span> Connected
                </>
              ) : (
                <>
                  <span className="red-255-text">●</span> Disconnected
                </>
              )}
            </li>
            {/* ToDo: 時計、電源状態 など */}
            <li className="red-255 white-255-text">
              <button onClick={onEStop}>
                <span className="yellow-255-text">◆</span> EMG STOP
              </button>
            </li>
          </ul>
        </div>
      </div>
    </RobotProvider>
  );
}
