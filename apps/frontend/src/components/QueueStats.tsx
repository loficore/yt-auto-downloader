import type { QueueInfo } from "@yt-auto-downloader/shared";

interface QueueStatsProps {
  stats: QueueInfo;
}

export function QueueStats({ stats }: QueueStatsProps) {
  return (
    <div className="queue-stats">
      <h3>📊 队列统计</h3>
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">总计</div>
        </div>
        <div className="stat-item">
          <div className="stat-value" style={{ color: "#f59e0b" }}>
            {stats.pending}
          </div>
          <div className="stat-label">等待中</div>
        </div>
        <div className="stat-item">
          <div className="stat-value" style={{ color: "#3b82f6" }}>
            {stats.downloading}
          </div>
          <div className="stat-label">下载中</div>
        </div>
        <div className="stat-item">
          <div className="stat-value" style={{ color: "#10b981" }}>
            {stats.completed}
          </div>
          <div className="stat-label">中断</div>
        </div>
        <div className="stat-item">
          <div className="stat-value" style={{ color: "#ef4444" }}>
            {stats.failed}
          </div>
          <div className="stat-label">失败</div>
        </div>
      </div>
    </div>
  );
}
