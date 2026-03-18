import type { DownloadTask } from "@yt-auto-downloader/shared";
import type { JSX } from "react";

interface DownloadListProps {
  tasks: DownloadTask[];
  onRemove: (id: string) => void;
  onClearCompleted: () => void;
}

export function DownloadList({
  tasks,
  onRemove,
  onClearCompleted,
}: DownloadListProps) {
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "⏳ 等待中",
      downloading: "⬇️ 下载中",
      completed: "✅ 已完成",
      failed: "❌ 失败",
      paused: "⏸️ 暂停",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "#f59e0b",
      downloading: "#3b82f6",
      completed: "#10b981",
      failed: "#ef4444",
      paused: "#8b5cf6",
    };
    return colors[status] || "#6b7280";
  };

  const getSafeHostname = (urlValue: unknown): string => {
    try {
      if (typeof urlValue !== "string" || !urlValue) {
        return "未知来源";
      }
      return new URL(urlValue).hostname || "未知来源";
    } catch {
      if (typeof urlValue === "string") {
        return urlValue.length > 30 ? `${urlValue.slice(0, 27)}...` : urlValue;
      }
      return "未知来源";
    }
  };

  return (
    <div className="download-list">
      <div className="list-header">
        <h2>📥 下载列表</h2>
        {tasks.some((t) => t.status === "completed") && (
          <button className="btn-secondary" onClick={onClearCompleted}>
            清理已完成
          </button>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state">
          <p>暂无任务</p>
          <p className="text-muted">在左侧添加URL开始下载</p>
        </div>
      ) : (
        <div className="task-list">
          {tasks.map((task) => (
            <div key={task.id} className="task-item">
              <div className="task-info">
                <div className="task-title">{getSafeHostname(task.url)}</div>
                <div className="task-url">{task.url}</div>
                <div className="task-meta">
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(task.status) }}
                  >
                    {getStatusLabel(task.status)}
                  </span>
                  {task.error && (
                    <span className="error-text">{task.error}</span>
                  )}
                </div>
              </div>

              {task.status === "downloading" && (
                <div className="task-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${task.progress}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">{task.progress}%</span>
                </div>
              )}

              <button
                className="btn-remove"
                onClick={() => onRemove(task.id)}
                title="删除"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
