import { Database } from "bun:sqlite";
import { resolve, dirname } from "path";
import { mkdirSync } from "fs";
import type { DownloadStatus } from "@yt-auto-downloader/shared";

/** 下载任务记录接口 */
export interface TaskRecord {
  /** 任务ID */
  id: string;
  /** 下载链接 */
  url: string;
  /** 艺术家 */
  artist: string | null;
  /** 歌曲标题 */
  title: string | null;
  /** 专辑名称 */
  album: string | null;
  /** 下载状态 */
  status: DownloadStatus;
  /** 下载进度（0-100） */
  progress: number;
  /** 错误信息（如果有） */
  error: string | null;
  /** 创建时间（Unix 时间戳） */
  created_at: number;
  /** 更新时间（Unix 时间戳） */
  updated_at: number;
  /** 下载完成后的文件路径 */
  file_path: string | null;
}

/** 订阅记录接口 */
export interface SubscriptionRecord {
  /** 订阅ID */
  id: string;
  /** 订阅 URL */
  url: string;
  /** 订阅名称 */
  name: string;
  /** 是否启用 */
  enabled: boolean;
  /** 最大下载数量 */
  max_items: number;
  /** 上次同步时间（Unix 时间戳） */
  last_synced_at: number | null;
  /** 创建时间（Unix 时间戳） */
  created_at: number;
  /** 更新时间（Unix 时间戳） */
  updated_at: number;
}

/** 播放列表视频记录接口 */
export interface VideoRecord {
  /** 视频ID（YouTube Video ID） */
  id: string;
  /** 所属播放列表ID */
  playlist_id: string;
  /** 视频标题 */
  title: string | null;
  /** 艺术家/频道名 */
  artist: string | null;
  /** 视频时长（秒） */
  duration: number | null;
  /** 是否已下载 */
  downloaded: boolean;
  /** 下载时间（Unix 时间戳） */
  downloaded_at: number | null;
  /** 视频在播放列表中的位置 */
  position: number;
}

/** 数据库服务类 */
export class DatabaseService {
  private db: Database;
  private dbPath: string;

  /**
   * 创建数据库服务实例
   * @param {string} dbPath SQLite 数据库文件路径，默认为 "./data/downloads.db"
   */
  constructor(dbPath = "./data/downloads.db") {
    const absolutePath = resolve(dirname(import.meta.filename), "..", "..", dbPath);
    this.dbPath = absolutePath;

    const dir = dirname(this.dbPath);
    mkdirSync(dir, { recursive: true });

    this.db = new Database(this.dbPath);
    this.init();
  }

  private init(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        artist TEXT,
        title TEXT,
        album TEXT,
        status TEXT DEFAULT 'pending',
        progress INTEGER DEFAULT 0,
        error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        file_path TEXT
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS videos (
        id TEXT NOT NULL,
        playlist_id TEXT NOT NULL,
        title TEXT,
        artist TEXT,
        duration INTEGER,
        downloaded INTEGER DEFAULT 0,
        downloaded_at INTEGER,
        position INTEGER DEFAULT 0,
        PRIMARY KEY (id, playlist_id)
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        max_items INTEGER DEFAULT 100,
        last_synced_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_videos_playlist ON videos(playlist_id)
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_videos_downloaded ON videos(downloaded)
    `);

    console.log("[💾] 数据库初始化完成:", this.dbPath);
  }

  /**
   * 保存下载任务
   * @param {TaskRecord} task 任务记录
   */
  saveTask(task: TaskRecord): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO tasks
      (id, url, artist, title, album, status, progress, error, created_at, updated_at, file_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      task.id,
      task.url,
      task.artist,
      task.title,
      task.album,
      task.status,
      task.progress,
      task.error,
      task.created_at,
      task.updated_at,
      task.file_path,
    );
  }

  /**
   * 加载所有下载任务记录
   * @returns {TaskRecord[]} 所有下载任务记录，按创建时间降序排列
   */
  loadTasks(): TaskRecord[] {
    const stmt = this.db.prepare(
      "SELECT * FROM tasks ORDER BY created_at DESC",
    );
    return stmt.all() as TaskRecord[];
  }

  /**
   * 删除下载任务
   * @param {string} id 任务ID
   */
  deleteTask(id: string): void {
    const stmt = this.db.prepare("DELETE FROM tasks WHERE id = ?");
    stmt.run(id);
  }

  /**
   * 清除所有已完成的下载任务记录
   */
  clearCompleted(): void {
    this.db.run("DELETE FROM tasks WHERE status = 'completed'");
  }

  /**
   * 批量保存视频记录
   * @param {VideoRecord[]} videos 视频记录数组
   */
  saveVideos(videos: VideoRecord[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO videos
      (id, playlist_id, title, artist, duration, downloaded, downloaded_at, position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const video of videos) {
      stmt.run(
        video.id,
        video.playlist_id,
        video.title,
        video.artist,
        video.duration,
        video.downloaded ? 1 : 0,
        video.downloaded_at,
        video.position,
      );
    }
  }

  /**
   * 获取播放列表中未下载的视频
   * @param {string} playlistId 播放列表ID
   * @param {number} limit 最大数量
   * @returns {VideoRecord[]} 未下载的视频列表
   */
  getUndownloadedVideos(playlistId: string, limit: number): VideoRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM videos
      WHERE playlist_id = ? AND downloaded = 0
      ORDER BY position ASC
      LIMIT ?
    `);
    const rows = stmt.all(playlistId, limit) as {
      id: string;
      playlist_id: string;
      title: string | null;
      artist: string | null;
      duration: number | null;
      downloaded: number;
      downloaded_at: number | null;
      position: number;
    }[];

    return rows.map((row) => ({
      id: row.id,
      playlist_id: row.playlist_id,
      title: row.title,
      artist: row.artist,
      duration: row.duration,
      downloaded: row.downloaded === 1,
      downloaded_at: row.downloaded_at,
      position: row.position,
    }));
  }

  /**
   * 标记视频为已下载
   * @param {string} videoId 视频ID
   * @param {string} playlistId 播放列表ID
   */
  markVideoDownloaded(videoId: string, playlistId: string): void {
    const stmt = this.db.prepare(`
      UPDATE videos
      SET downloaded = 1, downloaded_at = ?
      WHERE id = ? AND playlist_id = ?
    `);
    stmt.run(Date.now(), videoId, playlistId);
  }

  /**
   * 获取播放列表中的视频数量统计
   * @param {string} playlistId 播放列表ID
   * @returns {{ total: number; downloaded: number }} 总数和已下载数
   */
  getPlaylistStats(playlistId: string): { total: number; downloaded: number } {
    const totalStmt = this.db.prepare(
      "SELECT COUNT(*) as count FROM videos WHERE playlist_id = ?",
    );
    const totalRow = totalStmt.get(playlistId) as { count: number };

    const downloadedStmt = this.db.prepare(
      "SELECT COUNT(*) as count FROM videos WHERE playlist_id = ? AND downloaded = 1",
    );
    const downloadedRow = downloadedStmt.get(playlistId) as { count: number };

    return {
      total: totalRow.count,
      downloaded: downloadedRow.count,
    };
  }

  /**
   * 获取设置值
   * @param {string} key 设置键
   * @returns {string | null} 设置值，如果不存在则返回 null
   */
  getSetting(key: string): string | null {
    const stmt = this.db.prepare("SELECT value FROM settings WHERE key = ?");
    const row = stmt.get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  /**
   * 设置值
   * @param {string} key 设置键
   * @param {string} value 设置值
   */
  setSetting(key: string, value: string): void {
    const stmt = this.db.prepare(
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    );
    stmt.run(key, value);
  }

  /**
   * 获取所有订阅
   * @returns {SubscriptionRecord[]} 订阅列表
   */
  getSubscriptions(): SubscriptionRecord[] {
    const stmt = this.db.prepare(
      "SELECT * FROM subscriptions ORDER BY created_at DESC",
    );
    const rows = stmt.all() as {
      id: string;
      url: string;
      name: string;
      enabled: number;
      max_items: number;
      last_synced_at: number | null;
      created_at: number;
      updated_at: number;
    }[];

    return rows.map((row) => ({
      id: row.id,
      url: row.url,
      name: row.name,
      enabled: row.enabled === 1,
      max_items: row.max_items,
      last_synced_at: row.last_synced_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  /**
   * 获取启用的订阅
   * @returns {SubscriptionRecord[]} 启用的订阅列表
   */
  getEnabledSubscriptions(): SubscriptionRecord[] {
    const stmt = this.db.prepare(
      "SELECT * FROM subscriptions WHERE enabled = 1 ORDER BY created_at DESC",
    );
    const rows = stmt.all() as {
      id: string;
      url: string;
      name: string;
      enabled: number;
      max_items: number;
      last_synced_at: number | null;
      created_at: number;
      updated_at: number;
    }[];

    return rows.map((row) => ({
      id: row.id,
      url: row.url,
      name: row.name,
      enabled: row.enabled === 1,
      max_items: row.max_items,
      last_synced_at: row.last_synced_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  /**
   * 添加订阅
   * @param {string} url 订阅 URL
   * @param {string} name 订阅名称
   * @param {number} maxItems 最大下载数量
   * @returns {SubscriptionRecord} 新添加的订阅
   */
  addSubscription(url: string, name: string, maxItems = 100): SubscriptionRecord {
    const now = Date.now();
    const id = crypto.randomUUID();
    const stmt = this.db.prepare(`
      INSERT INTO subscriptions (id, url, name, enabled, max_items, last_synced_at, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, NULL, ?, ?)
    `);
    stmt.run(id, url, name, maxItems, now, now);

    return {
      id,
      url,
      name,
      enabled: true,
      max_items: maxItems,
      last_synced_at: null,
      created_at: now,
      updated_at: now,
    };
  }

  /**
   * 更新订阅
   * @param {string} id 订阅ID
   * @param {Partial<Omit<SubscriptionRecord, "id" | "created_at">>} updates 更新字段
   * @returns {boolean} 是否更新成功
   */
  updateSubscription(
    id: string,
    updates: Partial<Omit<SubscriptionRecord, "id" | "created_at">>,
  ): boolean {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.name !== undefined) {
      fields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.enabled !== undefined) {
      fields.push("enabled = ?");
      values.push(updates.enabled ? 1 : 0);
    }
    if (updates.max_items !== undefined) {
      fields.push("max_items = ?");
      values.push(updates.max_items);
    }
    if (updates.last_synced_at !== undefined) {
      fields.push("last_synced_at = ?");
      values.push(updates.last_synced_at);
    }

    if (fields.length === 0) return false;

    fields.push("updated_at = ?");
    values.push(Date.now());
    values.push(id);

    const stmt = this.db.prepare(
      `UPDATE subscriptions SET ${fields.join(", ")} WHERE id = ?`,
    );
    const result = stmt.run(...values);
    return result.changes > 0;
  }

  /**
   * 删除订阅
   * @param {string} id 订阅ID
   * @returns {boolean} 是否删除成功
   */
  deleteSubscription(id: string): boolean {
    const stmt = this.db.prepare("DELETE FROM subscriptions WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    this.db.close();
  }
}
