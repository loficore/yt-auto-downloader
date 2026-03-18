import { YoutubeManager } from './YoutubeManager';
import type { DownloadStatus } from '../../types/shared';

/**
 * 队列中的下载任务
 */
export interface QueueTask {
  /** 任务唯一标识符 */
  id: string;
  /** 下载链接 */
  url: string;
  /** 艺术家名称（可选） */
  artist?: string;
  /** 任务状态 */
  status: DownloadStatus;
  /** 下载进度（0-100） */
  progress: number;
  /** 任务创建时间戳 */
  createdAt: number;
  /** 任务更新时间戳 */
  updatedAt: number;
  /** 错误信息（如果有） */
  error?: string;
}

/**
 * 下载队列管理器
 */
export class DownloadQueue {
  private queue: Map<string, QueueTask> = new Map();
  private downloading: Set<string> = new Set();
  private maxConcurrent: number;
  private youtubeManager: YoutubeManager;
  private callbacks: {
    /**  任务更新回调 */
    onTaskUpdated?: (task: QueueTask) => void;
    /**
     * 队列变化回调
     */
    onQueueChanged?: () => void;
  } = {};

  /**
   * 初始化下载队列
   * @param {string} downloadDir - 下载目录
   * @param {number} maxConcurrent - 最大并发数
   */
  constructor(downloadDir: string, maxConcurrent = 1) {
    this.maxConcurrent = maxConcurrent;
    this.youtubeManager = new YoutubeManager(downloadDir, {
      /**
       * 下载开始回调
       * @param {string} taskId - 任务 ID
       * @returns {void}
       */
      onStart: (taskId) => this.updateTaskStatus(taskId, 'downloading'),
      /**
       * 下载进度回调
       * @param {string} taskId - 任务 ID
       * @param {number} progress - 下载进度
       * @returns {void}
       */
      onProgress: (taskId, progress) => this.updateTaskProgress(taskId, progress),
      /**
       * 下载完成回调
       * @param {string} taskId - 任务 ID
       * @returns {void}
       */
      onSuccess: (taskId) => this.updateTaskStatus(taskId, 'completed'),
      /**
       * 下载失败回调
       * @param {string} taskId - 任务 ID
       * @param {string} error - 错误信息
       * @returns {void}
       */
      onError: (taskId, error) => this.updateTaskStatus(taskId, 'failed', error),
    });
  }

  /**
   * 设置队列回调
   * @param {typeof this.callbacks} callbacks - 回调对象
   */
  setCallbacks(callbacks: typeof this.callbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * 添加单个下载任务
   * @param url - YouTube URL
   * @param artist - 艺术家名称（可选）
   * @returns 任务 ID
   */
  /**
   * 添加单个下载任务
   * @param {string} url - YouTube URL
   * @param {string} artist - 艺术家名称（可选）
   * @returns {string} 任务 ID
   */
  addTask(url: string, artist?: string): string {
    const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    
    const task: QueueTask = {
      id,
      url,
      artist,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.queue.set(id, task);
    this.callbacks.onTaskUpdated?.(task);
    this.callbacks.onQueueChanged?.();
    
    this.processQueue();
    return id;
  }

  /**
   * 批量添加下载任务
   * @param {string[]} urls - URL 数组
   * @returns {string[]} 任务 ID 数组
   */
  addBulkTasks(urls: string[]): string[] {
    return urls.map(url => this.addTask(url));
  }

  /**
   * 处理下载队列
   */
  private processQueue(): void {
    while (this.downloading.size < this.maxConcurrent) {
      const task = Array.from(this.queue.values()).find(t => t.status === 'pending');
      
      if (!task) break;

      this.downloading.add(task.id);
      
      // 后台处理，不等待
      void this.youtubeManager.downloadAudio(task.id, {
        url: task.url,
        artist: task.artist,
      }).finally(() => {
        this.downloading.delete(task.id);
        this.processQueue();
      });
    }
  }

  /**
   * 更新任务状态
   * @param {string} id - 任务 ID
   * @param {DownloadStatus} status - 新状态
   * @param {string} [error] - 错误信息（如果有）
   * @returns {void}
   */
  private updateTaskStatus(
    id: string,
    status: DownloadStatus,
    error?: string
  ): void {
    const task = this.queue.get(id);
    if (!task) return;

    task.status = status;
    task.updatedAt = Date.now();
    
    if (status === 'completed') {
      task.progress = 100;
    }
    
    if (error) {
      task.error = error;
    }

    this.callbacks.onTaskUpdated?.(task);
    this.callbacks.onQueueChanged?.();
  }

  /**
   * 更新任务进度
   * @param {string} id - 任务 ID
   * @param {number} progress - 任务进度
   * @returns {void}
   */
  private updateTaskProgress(id: string, progress: number): void {
    const task = this.queue.get(id);
    if (!task) return;

    const normalizedProgress = Math.max(0, Math.min(100, Math.floor(progress)));
    task.progress = normalizedProgress;
    task.updatedAt = Date.now();

    if (task.status === 'pending') {
      task.status = 'downloading';
      this.callbacks.onQueueChanged?.();
    }

    this.callbacks.onTaskUpdated?.(task);
  }

  /**
   * 获取单个任务
   * @param {string} id - 任务 ID
   * @returns {QueueTask | undefined} 任务对象
   */
  getTask(id: string): QueueTask | undefined {
    return this.queue.get(id);
  }

  /**
   * 获取所有任务
   * @returns {QueueTask[]} 任务数组
   */
  getAllTasks(): QueueTask[] {
    return Array.from(this.queue.values());
  }

  /**
   * 获取队列信息
   * @returns {object} 队列统计
   */
  getQueueInfo() {
    const tasks = Array.from(this.queue.values());
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      downloading: tasks.filter(t => t.status === 'downloading').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
    };
  }

  /**
   * 删除任务
   * @param {string} id - 任务 ID
   * @returns {boolean} 是否删除成功
   */
  removeTask(id: string): boolean {
    return this.queue.delete(id);
  }

  /**
   * 清除已完成的任务
   */
  clearCompleted(): void {
    for (const [id, task] of this.queue.entries()) {
      if (task.status === 'completed') {
        this.queue.delete(id);
      }
    }
    this.callbacks.onQueueChanged?.();
  }

  /**
   * 暂停任务
   * @param {string} id - 任务 ID
   */
  pauseTask(id: string): void {
    const task = this.queue.get(id);
    if (task && task.status === 'downloading') {
      task.status = 'paused';
      this.youtubeManager.cancelDownload(id);
      this.callbacks.onTaskUpdated?.(task);
    }
  }

  /**
   * 恢复任务
   * @param {string} id - 任务 ID
   */
  resumeTask(id: string): void {
    const task = this.queue.get(id);
    if (task && task.status === 'paused') {
      task.status = 'pending';
      this.callbacks.onTaskUpdated?.(task);
      this.processQueue();
    }
  }
}
