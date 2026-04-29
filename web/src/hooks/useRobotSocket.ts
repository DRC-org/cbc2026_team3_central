import { useCallback, useEffect, useRef, useState } from "react";

export interface MotorState {
  pos: number;
  vel: number;
  torque: number;
  temp: number;
}

export type BusHealthState = "ok" | "degraded" | "down";
export type MotorHealthState = "ok" | "stale" | "warning" | "fault";

export interface BusHealth {
  name: string;
  channel: string;
  state: BusHealthState;
  last_tx_at: number | null;
  last_rx_at: number | null;
  tx_error_count: number;
  rx_error_count: number;
  bus_off: boolean;
}

export interface MotorHealth {
  name: string;
  bus: string;
  state: MotorHealthState;
  last_feedback_at: number | null;
  feedback_age_ms: number | null;
  temperature: number;
  detail: string | null;
}

export interface HealthSnapshot {
  timestamp: number;
  overall: BusHealthState;
  buses: BusHealth[];
  motors: MotorHealth[];
}

export type HealthChangeLevel = "info" | "warning" | "critical";

export interface HealthChangeEvent {
  robot: string;
  level: HealthChangeLevel;
  target: string;
  from: string;
  to: string;
  message: string;
  receivedAt: number;
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
  health?: HealthSnapshot;
}

interface UseRobotSocketReturn {
  states: Record<string, RobotState>;
  connected: boolean;
  eStopActive: boolean;
  healthEvents: HealthChangeEvent[];
  setEStopActive: (active: boolean) => void;
  send: (data: object) => void;
}

const DEFAULT_URL = "ws://localhost:8080/ws";
const RECONNECT_INTERVAL = 3000;
// 直近警告のフラッシュ表示用にのみ保持。長期履歴は不要なので少量で十分
const HEALTH_EVENT_BUFFER = 5;

export function useRobotSocket(url: string = DEFAULT_URL): UseRobotSocketReturn {
  const [states, setStates] = useState<Record<string, RobotState>>({});
  const [connected, setConnected] = useState(false);
  const [eStopActive, setEStopActive] = useState(false);
  const [healthEvents, setHealthEvents] = useState<HealthChangeEvent[]>([]);
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
        } else if (msg.type === "health_change" && typeof msg.robot === "string") {
          const evt: HealthChangeEvent = {
            robot: msg.robot,
            level: (msg.level as HealthChangeLevel) ?? "info",
            target: typeof msg.target === "string" ? msg.target : "",
            from: typeof msg.from === "string" ? msg.from : "",
            to: typeof msg.to === "string" ? msg.to : "",
            message: typeof msg.message === "string" ? msg.message : "",
            receivedAt: Date.now(),
          };
          setHealthEvents((prev) => {
            // 新しい順で先頭、最大 HEALTH_EVENT_BUFFER 件のリングバッファ
            const next = [evt, ...prev];
            return next.length > HEALTH_EVENT_BUFFER ? next.slice(0, HEALTH_EVENT_BUFFER) : next;
          });
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

  return { states, connected, eStopActive, healthEvents, setEStopActive, send };
}
