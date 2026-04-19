import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "@/services/auth/tokenStorage";
import type { NotificationOut } from "@/services/notifications/notificationsApi";
import { useNotificationsStore } from "@/stores/notificationsStore";
import { useRealtimeInvalidations } from "@/hooks/useRealtimeInvalidations";
import { env } from "@/utils/env";

const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;
const AUTH_FAILURE_CODE = 4401;

interface UseNotificationsSocketResult {
  connected: boolean;
}

interface Envelope {
  type: string;
  data?: unknown;
  ts?: number;
}

function buildWsUrl(token: string): string {
  const wsBase = env.VITE_WS_BASE_URL;
  return `${wsBase}/ws/notifications?token=${encodeURIComponent(token)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isEnvelope(value: unknown): value is Envelope {
  if (!isRecord(value)) return false;
  return typeof value.type === "string";
}

function isNotificationOut(value: unknown): value is NotificationOut {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.created_at === "string"
  );
}

export function useNotificationsSocket(enabled: boolean): UseNotificationsSocketResult {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<number | null>(null);
  const backoffRef = useRef<number>(INITIAL_BACKOFF_MS);
  const disposedRef = useRef<boolean>(false);
  const add = useNotificationsStore((s) => s.add);
  const qc = useQueryClient();
  const { route } = useRealtimeInvalidations(qc);
  const routeRef = useRef(route);
  routeRef.current = route;

  useEffect(() => {
    if (!enabled) return;
    disposedRef.current = false;

    function connect(): void {
      if (disposedRef.current) return;
      const token = getAccessToken();
      if (!token) {
        scheduleReconnect();
        return;
      }

      const ws = new WebSocket(buildWsUrl(token));
      socketRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        backoffRef.current = INITIAL_BACKOFF_MS;
      };

      ws.onmessage = (event: MessageEvent<string>) => {
        try {
          const parsed: unknown = JSON.parse(event.data);
          if (!isEnvelope(parsed)) return;

          if (parsed.type === "ping") {
            ws.send(JSON.stringify({ type: "pong" }));
            return;
          }

          if (parsed.type === "notification") {
            if (isNotificationOut(parsed.data)) add(parsed.data);
            return;
          }

          routeRef.current(parsed.type, parsed.data);
        } catch {
          // malformed frame — ignore
        }
      };

      ws.onerror = () => {
        setConnected(false);
      };

      ws.onclose = (event) => {
        setConnected(false);
        socketRef.current = null;
        if (disposedRef.current) return;
        if (event.code === AUTH_FAILURE_CODE) {
          // Token invalid — stop retrying; a token refresh flow will re-enable.
          return;
        }
        scheduleReconnect();
      };
    }

    function scheduleReconnect(): void {
      if (disposedRef.current) return;
      const delay = backoffRef.current;
      retryRef.current = window.setTimeout(connect, delay);
      backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
    }

    connect();

    return () => {
      disposedRef.current = true;
      if (retryRef.current !== null) window.clearTimeout(retryRef.current);
      retryRef.current = null;
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.close();
        socketRef.current = null;
      }
      setConnected(false);
    };
  }, [enabled, add]);

  return { connected };
}
