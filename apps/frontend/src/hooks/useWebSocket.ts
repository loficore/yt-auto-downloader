import { useEffect, useRef, useState } from "react";
import type { WebSocketMessage } from "@yt-auto-downloader/shared";
import { isWebSocketMessage } from "../utils/typeGuards";
import { logger } from "../utils/logger";

/**
 * WebSocket Hook
 * 连接后端 WebSocket 服务器，处理消息并提供连接状态
 * 自动重连机制，支持开发环境和生产环境的不同 URL 配置
 * 可选的消息、连接和断开回调函数
 */
export interface UseWebSocketOptions {
  /** WebSocket 消息回调函数 */
  onMessage?: (message: WebSocketMessage) => void;
  /** WebSocket 连接回调函数 */
  onConnect?: () => void;
  /** WebSocket 断开回调函数 */
  onDisconnect?: () => void;
}

/** 
 * 使用 WebSocket Hook
 */
export interface UseWebSocketReturn {
  /** WebSocket 连接状态 */
  connected: boolean;
}

/**
 * 使用 WebSocket Hook
 * @param {UseWebSocketOptions} options WebSocket 配置选项
 * @returns {UseWebSocketReturn} WebSocket 连接状态
 */
export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const { onMessage, onConnect, onDisconnect } = options;
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);

  onMessageRef.current = onMessage;
  onConnectRef.current = onConnect;
  onDisconnectRef.current = onDisconnect;

  useEffect(() => {
    const isDev = import.meta.env.DEV;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = isDev
      ? "ws://localhost:3000/ws"
      : `${protocol}//${window.location.host}/ws`;

    let retryDelay = 1000;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;
    let ws: WebSocket | null = null;

    const connect = () => {
      if (closed) return;
      ws = new WebSocket(wsUrl);
      setupHandlers(ws);
    };

    const scheduleReconnect = () => {
      if (closed) return;
      retryTimer = setTimeout(() => {
        retryDelay = Math.min(retryDelay * 2, 30000);
        connect();
      }, retryDelay);
    };

    const setupHandlers = (socket: WebSocket) => {
      socket.onopen = () => {
        logger.info("WebSocket connected");
        retryDelay = 1000;
        setConnected(true);
        onConnectRef.current?.();
      };

      socket.onmessage = (event: MessageEvent<string>) => {
        try {
          const data: unknown = JSON.parse(event.data);
          if (!isWebSocketMessage(data)) {
            logger.warn("Ignored unknown WebSocket message", { data });
            return;
          }
          onMessageRef.current?.(data);
        } catch (err: unknown) {
          logger.error("Failed to parse WebSocket message", { error: err });
        }
      };

      socket.onerror = () => {
        logger.error("WebSocket error");
        setConnected(false);
      };

      socket.onclose = () => {
        logger.info("WebSocket disconnected, reconnecting...", { retryDelay: retryDelay / 1000 });
        setConnected(false);
        onDisconnectRef.current?.();
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      ws?.close();
    };
  }, []);

  return { connected };
}
