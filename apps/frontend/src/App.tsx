import React, { useState, useEffect, useRef } from "react";
import type { JSX } from "react";
import type {
  DownloadTask,
  QueueInfo,
  WebSocketMessage,
} from "@yt-auto-downloader/shared";
import { DownloadList } from "./components/DownloadList.tsx";
import { BatchImport } from "./components/BatchImport.tsx";
import { QueueStats } from "./components/QueueStats.tsx";

interface AddTaskData {
  taskId: string;
  task: DownloadTask | null;
}

interface BulkImportData {
  taskIds: string[];
  count: number;
}

interface RemoveTaskData {
  removed: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDownloadTask(value: unknown): value is DownloadTask {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.url === "string" &&
    typeof value.status === "string" &&
    typeof value.progress === "number" &&
    typeof value.createdAt === "number" &&
    typeof value.updatedAt === "number" &&
    typeof value.title === "string"
  );
}

function isQueueInfo(value: unknown): value is QueueInfo {
  if (!isRecord(value)) return false;
  return (
    typeof value.total === "number" &&
    typeof value.pending === "number" &&
    typeof value.downloading === "number" &&
    typeof value.completed === "number" &&
    typeof value.failed === "number"
  );
}

function isWebSocketMessage(value: unknown): value is WebSocketMessage {
  if (
    !isRecord(value) ||
    typeof value.type !== "string" ||
    !("data" in value)
  ) {
    return false;
  }

  const data = value.data;
  switch (value.type) {
    case "task-added":
      return isDownloadTask(data);
    case "task-progress":
      return (
        isRecord(data) &&
        typeof data.id === "string" &&
        typeof data.progress === "number"
      );
    case "task-completed":
      return isRecord(data) && typeof data.id === "string";
    case "task-failed":
      return (
        isRecord(data) &&
        typeof data.id === "string" &&
        typeof data.error === "string"
      );
    case "queue-info":
      return isQueueInfo(data);
    case "task-log":
      return (
        isRecord(data) &&
        typeof data.id === "string" &&
        typeof data.log === "string"
      );
    default:
      return false;
  }
}

async function requestApi<T>(
  input: string,
  validateData: (data: unknown) => data is T,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("响应 JSON 解析失败");
  }

  if (!isRecord(payload) || typeof payload.success !== "boolean") {
    throw new Error("响应结构不合法");
  }

  if (!payload.success) {
    const errText =
      typeof payload.error === "string" ? payload.error : "请求失败";
    throw new Error(errText);
  }

  if (!("data" in payload) || !validateData(payload.data)) {
    throw new Error("响应 data 结构不合法");
  }

  return payload.data;
}

function isTaskArray(value: unknown): value is DownloadTask[] {
  return Array.isArray(value) && value.every((item) => isDownloadTask(item));
}

function isAddTaskData(value: unknown): value is AddTaskData {
  return (
    isRecord(value) &&
    typeof value.taskId === "string" &&
    (value.task === null || isDownloadTask(value.task))
  );
}

function isBulkImportData(value: unknown): value is BulkImportData {
  return (
    isRecord(value) &&
    Array.isArray(value.taskIds) &&
    value.taskIds.every((item) => typeof item === "string") &&
    typeof value.count === "number"
  );
}

function isRemoveTaskData(value: unknown): value is RemoveTaskData {
  return isRecord(value) && typeof value.removed === "boolean";
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): {
    hasError: boolean;
    error: Error;
  } {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error): void {
    console.error("组件错误:", error);
  }

  override render(): JSX.Element {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", color: "#ef4444" }}>
          <h2>⚠️ 组件加载失败</h2>
          <p>{this.state.error?.message || "未知错误"}</p>
        </div>
      );
    }

    return this.props.children as JSX.Element;
  }
}

export function App() {
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [queueInfo, setQueueInfo] = useState<QueueInfo>({
    total: 0,
    pending: 0,
    downloading: 0,
    completed: 0,
    failed: 0,
  });
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const isDev = import.meta.env.DEV;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = isDev
      ? "ws://localhost:3000/ws"
      : `${protocol}//${window.location.host}/ws`;

    let retryDelay = 1000;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      if (closed) return;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      setupHandlers(ws);
    };

    const scheduleReconnect = () => {
      if (closed) return;
      retryTimer = setTimeout(() => {
        retryDelay = Math.min(retryDelay * 2, 30000);
        connect();
      }, retryDelay);
    };

    const setupHandlers = (ws: WebSocket) => {
      ws.onopen = () => {
        console.log("✅ WebSocket 已连接");
        retryDelay = 1000;
        setConnected(true);
        void fetchQueueData();
      };

      ws.onmessage = (event: MessageEvent<string>) => {
        try {
          const data: unknown = JSON.parse(event.data);
          if (!isWebSocketMessage(data)) {
            console.warn("忽略未知 WebSocket 消息:", data);
            return;
          }
          handleWebSocketMessage(data);
        } catch (err: unknown) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      ws.onerror = (event: Event) => {
        console.error("❌ WebSocket 错误:", event);
        setConnected(false);
      };

      ws.onclose = () => {
        console.log(`💬 WebSocket 已断开，${retryDelay / 1000}s 后重连...`);
        setConnected(false);
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      wsRef.current?.close();
    };
  }, []);

  const fetchQueueData = async () => {
    try {
      const data = await requestApi("/api/download/queue", isTaskArray);
      setTasks(data);
    } catch (err: unknown) {
      console.error("Failed to fetch queue:", err);
    }
  };

  const handleWebSocketMessage = (message: WebSocketMessage): void => {
    switch (message.type) {
      case "task-added":
        setTasks((prev) => [...prev, message.data]);
        break;
      case "task-progress":
        setTasks((prev) =>
          prev.map((t) =>
            t.id === message.data.id
              ? { ...t, progress: message.data.progress }
              : t,
          ),
        );
        break;
      case "queue-info":
        setQueueInfo(message.data);
        break;
      case "task-completed":
        setTasks((prev) =>
          prev.map((t) =>
            t.id === message.data.id
              ? { ...t, status: "completed", progress: 100 }
              : t,
          ),
        );
        break;
      case "task-failed":
        setTasks((prev) =>
          prev.map((t) =>
            t.id === message.data.id
              ? { ...t, status: "failed", error: message.data.error }
              : t,
          ),
        );
        break;
    }
  };

  const handleAddTask = async (url: string): Promise<void> => {
    try {
      const data = await requestApi("/api/download/add", isAddTaskData, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      console.log("✅ 任务已添加:", data.taskId);
    } catch (err: unknown) {
      console.error("Failed to add task:", err);
    }
  };

  const handleBulkImport = async (urls: string[]): Promise<void> => {
    try {
      const data = await requestApi("/api/download/bulk", isBulkImportData, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      console.log(`✅ 已添加 ${data.count} 个任务`);
    } catch (err: unknown) {
      console.error("Failed to bulk import:", err);
    }
  };

  const handleRemoveTask = async (id: string): Promise<void> => {
    try {
      const data = await requestApi(
        `/api/download/task/${id}`,
        isRemoveTaskData,
        {
          method: "DELETE",
        },
      );
      if (data.removed) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err: unknown) {
      console.error("Failed to remove task:", err);
    }
  };

  const handleClearCompleted = async (): Promise<void> => {
    try {
      await requestApi("/api/download/clear-completed", isQueueInfo, {
        method: "POST",
      });
      setTasks((prev) => prev.filter((t) => t.status !== "completed"));
    } catch (err: unknown) {
      console.error("Failed to clear completed:", err);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎵 YouTube Auto Downloader</h1>
        <div className="connection-status">
          <span
            className={`status-dot ${connected ? "connected" : "disconnected"}`}
          ></span>
          {connected ? "已连接" : "未连接"}
        </div>
      </header>

      <main className="app-main">
        <div className="sidebar">
          <QueueStats stats={queueInfo} />
          <BatchImport
            onImport={(urls) => {
              void handleBulkImport(urls);
            }}
            onAddSingle={(url) => {
              void handleAddTask(url);
            }}
          />
        </div>

        <div className="content">
          <ErrorBoundary>
            <DownloadList
              tasks={tasks}
              onRemove={(id) => {
                void handleRemoveTask(id);
              }}
              onClearCompleted={() => {
                void handleClearCompleted();
              }}
            />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
