import { YoutubeManager } from "./YoutubeManager";
import { PlaylistService } from "./PlaylistService";
import { DatabaseService } from "./Database";
import { RateLimiter } from "./RateLimiter";
import type { DownloadStatus, QueueInfo } from "@yt-auto-downloader/shared";
import { config } from "../config";
import { logger } from "@yt-auto-downloader/shared";
import { readdirSync } from "fs";
import { extname, join } from "path";

/**
 * 队列中的下载任务
 */
export interface QueueTask {
  /** 任务唯一标识符 */
  id: string;
  /** 下载链接 */
  url: string;
  /** 视频标题 */
  title?: string;
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
  /** 所属播放列表 ID（仅歌单同步任务） */
  playlistId?: string;
}

/**
 * 下载队列管理器
 */
export class DownloadQueue {
  private queue: Map<string, QueueTask> = new Map();
  private downloading: Set<string> = new Set();
  private maxConcurrent: number;
  private downloadDir: string;
  private youtubeManager: YoutubeManager;
  private playlistService: PlaylistService;
  private db: DatabaseService;
  private rateLimiter: RateLimiter;
  private localDownloadedIds: Set<string> = new Set();
  private localIndexBuilt = false;
  private downloadedByPlaylist: Map<string, Set<string>> = new Map();
  private playlistStatsCache: Map<string, { total: number; downloaded: number }> =
    new Map();
  private readonly audioExtensions = new Set([".opus", ".m4a", ".webm", ".mp3"]);
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
   * @param {DatabaseService} db - 数据库服务实例
   */
  constructor(downloadDir: string, maxConcurrent = 1, db?: DatabaseService) {
    this.maxConcurrent = maxConcurrent;
    this.downloadDir = downloadDir;
    this.db = db || new DatabaseService();
    this.playlistService = new PlaylistService();
    this.rateLimiter = new RateLimiter(
      config.maxDownloadsPerMinute || 5,
      config.downloadDelayMin || 1000,
      config.downloadDelayMax || 5000,
    );
    this.youtubeManager = new YoutubeManager(downloadDir, {
      /**
       * 下载开始回调
       * @param {string} taskId - 任务 ID
       * @returns {void}
       */
      onStart: (taskId) => this.updateTaskStatus(taskId, "downloading"),
      /**
       * 下载进度回调
       * @param {string} taskId - 任务 ID
       * @param {number} progress - 下载进度
       * @returns {void}
       */
      onProgress: (taskId, progress) =>
        this.updateTaskProgress(taskId, progress),
      /**
       * 下载完成回调
       * @param {string} taskId - 任务 ID
       * @returns {void}
       */
      onSuccess: (taskId) => this.handleDownloadSuccess(taskId),
      /**
       * 下载失败回调
       * @param {string} taskId - 任务 ID
       * @param {string} error - 错误信息
       * @returns {void}
       */
      onError: (taskId, error) =>
        this.updateTaskStatus(taskId, "failed", error),
    });
  }

  /**
   * 处理下载成功
   * @param {string} taskId - 任务 ID
   */
  private handleDownloadSuccess(taskId: string): void {
    const task = this.queue.get(taskId);
    if (task) {
      const videoIdMatch = task.url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
      if (videoIdMatch && videoIdMatch[1]) {
        const videoId = videoIdMatch[1];
        this.localDownloadedIds.add(videoId);

        if (task.playlistId) {
          const downloadedSet = this.getPlaylistDownloadedSet(task.playlistId);
          downloadedSet.add(videoId);

          const stats = this.playlistStatsCache.get(task.playlistId);
          if (stats) {
            stats.downloaded = Math.min(stats.total, downloadedSet.size);
            this.playlistStatsCache.set(task.playlistId, stats);
          }
        }
      }
    }
    this.updateTaskStatus(taskId, "completed");
  }

  /**
   * 同步播放列表
   * @param {string} playlistUrl - 播放列表 URL
   * @param {number} [limit] - 每次同步的最大下载数量，默认使用全局配置
   * @param {string} [subscriptionId] - 订阅 ID（用于记录下载位置）
   * @returns {{ added: number; total: number; downloaded: number }} 添加的任务数统计
   */
  async syncPlaylist(playlistUrl: string, limit?: number, subscriptionId?: string): Promise<{
    added: number;
    total: number;
    downloaded: number;
  }> {
    logger.info("syncPlaylist called", { playlistUrl, limit, subscriptionId });
    
    const playlist = await this.playlistService.getPlaylist(playlistUrl);
    if (!playlist) {
      logger.warn("Failed to get playlist info", { playlistUrl });
      return { added: 0, total: 0, downloaded: 0 };
    }

    void subscriptionId;
    this.ensureLocalDownloadedIndex();

    const downloadedSet = this.getPlaylistDownloadedSet(playlist.id);
    for (const video of playlist.videos) {
      if (this.localDownloadedIds.has(video.id)) {
        downloadedSet.add(video.id);
      }
    }

    // 获取待下载的视频（纯内存计算）
    const maxDownloads = limit ?? config.maxDownloadsPerSync ?? 10;
    const videosToDownload = playlist.videos
      .filter((video) => !downloadedSet.has(video.id))
      .slice(0, maxDownloads);

    // 创建下载任务
    let added = 0;
    for (const video of videosToDownload) {
      if (this.hasTaskForVideo(video.id)) {
        continue;
      }

      const url = `https://www.youtube.com/watch?v=${video.id}`;
      this.addTask(
        url,
        video.title ?? undefined,
        video.artist ?? undefined,
        playlist.id,
      );
      added++;
    }

    const stats = {
      total: playlist.videos.length,
      downloaded: downloadedSet.size,
    };
    this.playlistStatsCache.set(playlist.id, stats);

    logger.info("Playlist sync completed", {
      added,
      total: stats.total,
      downloaded: stats.downloaded,
    });

    return {
      added,
      total: stats.total,
      downloaded: stats.downloaded,
    };
  }

  /**
   * 获取播放列表统计信息
   * @param {string} playlistId - 播放列表ID
   * @returns {{ total: number; downloaded: number }} 统计信息
   */
  getPlaylistStats(playlistId: string): { total: number; downloaded: number } {
    return this.playlistStatsCache.get(playlistId) ?? { total: 0, downloaded: 0 };
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
   * @param {string} url - YouTube URL
   * @param {string} [title] - 视频标题（可选）
   * @param {string} [artist] - 艺术家名称（可选）
   * @returns {string} 任务 ID
   */
  addTask(url: string, title?: string, artist?: string, playlistId?: string): string {
    const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    const task: QueueTask = {
      id,
      url,
      title,
      artist,
      status: "pending",
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      playlistId,
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
    return urls.map((url) => this.addTask(url));
  }

  /**
   * 获取视频信息并下载
   * @param {QueueTask} task - 任务
   */
  private async fetchAndDownload(task: QueueTask): Promise<void> {
    try {
      const info = await this.youtubeManager.getVideoInfo(task.url) as { title?: string; artist?: string } | null;
      if (info) {
        task.title = info.title;
        task.artist = info.artist;
        this.callbacks.onTaskUpdated?.(task);
      }
    } catch (err) {
      logger.warn("Failed to get video info, using URL as title", { taskId: task.id, error: err });
    }

    try {
      await this.youtubeManager.downloadAudio(task.id, {
        url: task.url,
        title: task.title,
        artist: task.artist,
      });
    } finally {
      this.downloading.delete(task.id);
      this.rateLimiter.recordSuccess();
      this.processQueue();
    }
  }

  /**
   * 处理下载队列
   */
  private processQueue(): void {
    if (this.downloading.size >= this.maxConcurrent) return;

    const task = Array.from(this.queue.values()).find(
      (t) => t.status === "pending",
    );

    if (!task) return;

    const delay = this.rateLimiter.getNextDelay();
    const rateInfo = this.rateLimiter.getInfo();

    if (delay > 0) {
      logger.info(`Rate limit: waiting ${Math.round(delay)}ms (window: ${rateInfo.currentCount}/${rateInfo.rpm})`);
      setTimeout(() => this.processQueue(), delay);
      return;
    }

    this.downloading.add(task.id);

    void this.fetchAndDownload(task);
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
    error?: string,
  ): void {
    const task = this.queue.get(id);
    if (!task) return;

    task.status = status;
    task.updatedAt = Date.now();

    if (status === "completed") {
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

    if (task.status === "pending") {
      task.status = "downloading";
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
   * @returns {QueueInfo} 队列统计
   */
  getQueueInfo(): QueueInfo {
    const tasks = Array.from(this.queue.values());
    return {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === "pending").length,
      downloading: tasks.filter((t) => t.status === "downloading").length,
      completed: tasks.filter((t) => t.status === "completed").length,
      failed: tasks.filter((t) => t.status === "failed").length,
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
      if (task.status === "completed") {
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
    if (task && task.status === "downloading") {
      task.status = "paused";
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
    if (task && task.status === "paused") {
      task.status = "pending";
      task.error = undefined;
      this.callbacks.onTaskUpdated?.(task);
      this.processQueue();
    }
  }

  /**
   * 重试失败的任务
   * @param {string} id - 任务 ID
   */
  retryTask(id: string): void {
    const task = this.queue.get(id);
    if (task && task.status === "failed") {
      task.status = "pending";
      task.progress = 0;
      task.error = undefined;
      this.callbacks.onTaskUpdated?.(task);
      this.processQueue();
    }
  }

  /**
   * 关闭队列，保存状态
   */
  shutdown(): void {
    this.db.close();
    logger.info("Queue shutdown");
  }

  /**
   * 获取播放列表已下载集合
   * @param {string} playlistId - 播放列表 ID
   * @returns {Set<string>} 视频 ID 集合
   */
  private getPlaylistDownloadedSet(playlistId: string): Set<string> {
    const existing = this.downloadedByPlaylist.get(playlistId);
    if (existing) {
      return existing;
    }

    const created = new Set<string>();
    this.downloadedByPlaylist.set(playlistId, created);
    return created;
  }

  /**
   * 判断视频是否已在当前任务队列中
   * @param {string} videoId - 视频 ID
   * @returns {boolean} 是否已存在相关任务
   */
  private hasTaskForVideo(videoId: string): boolean {
    for (const task of this.queue.values()) {
      const idMatch = task.url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
      if (idMatch?.[1] === videoId && task.status !== "failed") {
        return true;
      }
    }

    return false;
  }

  /**
   * 构建本地已下载视频索引
   */
  private ensureLocalDownloadedIndex(): void {
    if (this.localIndexBuilt) {
      return;
    }

    const walk = (dir: string, inheritedVideoId?: string): void => {
      let entries: { name: string; isDirectory(): boolean }[];
      try {
        entries = readdirSync(dir, {
          withFileTypes: true,
          encoding: "utf-8",
        }) as { name: string; isDirectory(): boolean }[];
      } catch {
        return;
      }

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          const match = entry.name.match(/\(([a-zA-Z0-9_-]{11})\)\s*$/);
          const currentVideoId = match?.[1] || inheritedVideoId;
          walk(fullPath, currentVideoId);
          continue;
        }

        if (!inheritedVideoId) {
          continue;
        }

        const extension = extname(entry.name).toLowerCase();
        if (!this.audioExtensions.has(extension)) {
          continue;
        }

        this.localDownloadedIds.add(inheritedVideoId);
      }
    };

    walk(this.downloadDir);
    this.localIndexBuilt = true;
    logger.info("Local downloaded index built", {
      count: this.localDownloadedIds.size,
    });
  }
}
