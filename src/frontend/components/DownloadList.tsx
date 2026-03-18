import React from 'react';
import type { DownloadTask } from '../../types/shared';
import type { JSX } from 'react';

/**
 * 下载列表组件属性接口
 */
interface DownloadListProps {
  /** 下载任务数组 */
  tasks: DownloadTask[];
  /** 删除任务回调函数 */
  onRemove: (id: string) => void;
  /** 清理已完成任务回调函数 */
  onClearCompleted: () => void;
}

/**
 * 下载列表组件
 * @param {DownloadListProps} props - 组件属性
 * @returns {JSX.Element} 组件 JSX 元素
 */
export function DownloadList({ tasks, onRemove, onClearCompleted }: DownloadListProps) {
  /**
   * 获取状态标签
   * @param {string} status - 任务状态
   * @returns {string} 状态标签
   */
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '⏳ 等待中',
      downloading: '⬇️ 下载中',
      completed: '✅ 已完成',
      failed: '❌ 失败',
      paused: '⏸️ 暂停',
    };
    return labels[status] || status;
  };

  /**
   * 获取状态颜色
   * @param {string} status - 任务状态
   * @returns {string} 颜色代码
   */
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#f59e0b',
      downloading: '#3b82f6',
      completed: '#10b981',
      failed: '#ef4444',
      paused: '#8b5cf6',
    };
    return colors[status] || '#6b7280';
  };

  /**
   * 安全地获取 URL 主机名
   * @param {unknown} urlValue - URL 值
   * @returns {string} 主机名或显示名称
   */
  const getSafeHostname = (urlValue: unknown): string => {
    try {
      if (typeof urlValue !== 'string' || !urlValue) {
        return '未知来源';
      }
      return new URL(urlValue).hostname || '未知来源';
    } catch {
      // 如果 URL 解析失败，尝试提取域名或返回截断的 URL
      if (typeof urlValue === 'string') {
        return urlValue.length > 30 ? `${urlValue.slice(0, 27)}...` : urlValue;
      }
      return '未知来源';
    }
  };

  return (
    <div className="download-list">
      <div className="list-header">
        <h2>📥 下载列表</h2>
        {tasks.some(t => t.status === 'completed') && (
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
          {tasks.map(task => (
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
                  {task.error && <span className="error-text">{task.error}</span>}
                </div>
              </div>

              {task.status === 'downloading' && (
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
