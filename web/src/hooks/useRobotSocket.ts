import { useCallback, useEffect, useRef, useState } from "react";

export interface MotorState {
  pos: number;
  vel: number;
  torque: number;
  temp: number;
}

export interface RobotState {
  robot: string;
  sequence: string;
  current_step: string | null;
  step_index: number;
  total_steps: number;
  waiting_trigger: boolean;
  motors: Record<string, MotorState>;
  e_stop_active?: boolean;
}

interface UseRobotSocketReturn {
  states: Record<string, RobotState>;
  connected: boolean;
  eStopActive: boolean;
  setEStopActive: (active: boolean) => void;
  send: (data: object) => void;
}

const DEFAULT_URL = "ws://localhost:8080/ws";
const RECONNECT_INTERVAL = 3000;

export function useRobotSocket(url: string = DEFAULT_URL): UseRobotSocketReturn {
  const [states, setStates] = useState<Record<string, RobotState>>({});
  const [connected, setConnected] = useState(false);
  const [eStopActive, setEStopActive] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.addEventListener("open", () => setConnected(true));

    ws.addEventListener("close", () => {
      setConnected(false);
      reconnectTimer.current = setTimeout(connect, RECONNECT_INTERVAL);
    });

    ws.addEventListener("error", () => ws.close());

    ws.addEventListener("message", (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "state" && msg.robot) {
          setStates((prev) => ({ ...prev, [msg.robot]: msg }));
          if (typeof msg.e_stop_active === "boolean") {
            setEStopActive(msg.e_stop_active);
          }
        } else if (msg.type === "e_stop_state" && typeof msg.active === "boolean") {
          setEStopActive(msg.active);
        }
      } catch {
        // 不正な JSON は無視
      }
    });
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { states, connected, eStopActive, setEStopActive, send };
}
