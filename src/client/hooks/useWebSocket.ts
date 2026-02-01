import { useEffect, useRef, useCallback, useState } from 'react';
import type { ServerMessage, ClientMessage } from '@shared/protocol';

type MessageHandler = (msg: ServerMessage) => void;

export function useWebSocket(onMessage: MessageHandler) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef(onMessage);
  handlersRef.current = onMessage;
  const pendingSubsRef = useRef<Map<string, ClientMessage>>(new Map());

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let ws: WebSocket;
    let disposed = false;

    function connect() {
      if (disposed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (disposed) { ws.close(); return; }
        setConnected(true);
        // Re-subscribe all active sessions on reconnect
        for (const sub of pendingSubsRef.current.values()) {
          ws.send(JSON.stringify(sub));
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg: ServerMessage = JSON.parse(event.data);
          handlersRef.current(msg);
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (disposed) return;
        setConnected(false);
        wsRef.current = null;
        reconnectTimer = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      disposed = true;
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

  const send = useCallback((msg: ClientMessage) => {
    // Track subscriptions so we can re-send all on reconnect
    if (msg.type === 'subscribe_session') {
      pendingSubsRef.current.set(msg.sessionId, msg);
    } else if (msg.type === 'unsubscribe_session') {
      pendingSubsRef.current.delete(msg.sessionId);
    }
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { send, connected };
}
