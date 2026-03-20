import React, { useCallback, useMemo } from "react";
import { DownloadList } from "./components/DownloadList";
import { PlaylistSync } from "./components/PlaylistSync";
import { QueueStats } from "./components/QueueStats";
import { useWebSocket } from "./hooks/useWebSocket";
import { useDownloadTasks } from "./hooks/useDownloadTasks";

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

  override render(): React.JSX.Element {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", color: "#ef4444" }}>
          <h2>⚠️ 组件加载失败</h2>
          <p>{this.state.error?.message || "未知错误"}</p>
        </div>
      );
    }

    return this.props.children as React.JSX.Element;
  }
}

/**
 * Main application component.
 * @returns {React.JSX.Element} The rendered application.
 */
export function App() {
  const {
    tasks,
    queueInfo,
    removeTask,
    clearCompleted,
    syncPlaylist,
    refreshTasks,
    handleWebSocketMessage,
  } = useDownloadTasks();

  const { connected } = useWebSocket({
    onMessage: handleWebSocketMessage,
    onConnect: () => {
      void refreshTasks();
    },
  });

  const handleRemoveTask = useCallback(
    (id: string) => {
      void removeTask(id);
    },
    [removeTask],
  );

  const handleClearCompleted = useCallback(() => {
    void clearCompleted();
  }, [clearCompleted]);

  const sidebarContent = useMemo(
    () => (
      <QueueStats stats={queueInfo} />
    ),
    [queueInfo],
  );

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
          {sidebarContent}
          <PlaylistSync onSync={syncPlaylist} />
        </div>

        <div className="content">
          <ErrorBoundary>
            <DownloadList
              tasks={tasks}
              onRemove={handleRemoveTask}
              onClearCompleted={handleClearCompleted}
            />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
