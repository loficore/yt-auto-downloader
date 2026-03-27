import { Database } from "bun:sqlite";
import { resolve, dirname } from "path";
import { mkdirSync } from "fs";

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
  /** 每次同步最大下载数量 */
  limit_per_sync: number | null;
  /** 上次同步时间（Unix 时间戳） */
  last_synced_at: number | null;
  /** 上次下载到的位置 */
  last_position: number;
  /** 创建时间（Unix 时间戳） */
  created_at: number;
  /** 更新时间（Unix 时间戳） */
  updated_at: number;
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
        limit_per_sync INTEGER DEFAULT 10,
        last_synced_at INTEGER,
        last_position INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    try {
      this.db.run(`ALTER TABLE subscriptions ADD COLUMN limit_per_sync INTEGER DEFAULT 10`);
    } catch {
      // Column already exists
    }

    console.log("[💾] 数据库初始化完成:", this.dbPath);
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
      limit_per_sync: number | null;
      last_synced_at: number | null;
      last_position: number;
      created_at: number;
      updated_at: number;
    }[];

    return rows.map((row) => ({
      id: row.id,
      url: row.url,
      name: row.name,
      enabled: row.enabled === 1,
      limit_per_sync: row.limit_per_sync,
      last_synced_at: row.last_synced_at,
      last_position: row.last_position ?? 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  /**
   * 获取单个订阅
   * @param {string} id 订阅ID
   * @returns {SubscriptionRecord | null} 订阅记录
   */
  getSubscription(id: string): SubscriptionRecord | null {
    const stmt = this.db.prepare("SELECT * FROM subscriptions WHERE id = ?");
    const row = stmt.get(id) as {
      id: string;
      url: string;
      name: string;
      enabled: number;
      limit_per_sync: number | null;
      last_synced_at: number | null;
      last_position: number;
      created_at: number;
      updated_at: number;
    } | undefined;

    if (!row) return null;

    return {
      id: row.id,
      url: row.url,
      name: row.name,
      enabled: row.enabled === 1,
      limit_per_sync: row.limit_per_sync,
      last_synced_at: row.last_synced_at,
      last_position: row.last_position ?? 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
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
      limit_per_sync: number | null;
      last_synced_at: number | null;
      last_position: number;
      created_at: number;
      updated_at: number;
    }[];

    return rows.map((row) => ({
      id: row.id,
      url: row.url,
      name: row.name,
      enabled: row.enabled === 1,
      limit_per_sync: row.limit_per_sync,
      last_synced_at: row.last_synced_at,
      last_position: row.last_position ?? 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  /**
   * 添加订阅
   * @param {string} url 订阅 URL
   * @param {string} name 订阅名称
   * @param {number | null} limitPerSync 每次同步最大下载数量，默认为 10
   * @returns {SubscriptionRecord} 新添加的订阅
   */
  addSubscription(url: string, name: string, limitPerSync: number | null = 10): SubscriptionRecord {
    const now = Date.now();
    const id = crypto.randomUUID();
    const stmt = this.db.prepare(`
      INSERT INTO subscriptions (id, url, name, enabled, limit_per_sync, last_synced_at, last_position, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, NULL, 0, ?, ?)
    `);
    stmt.run(id, url, name, limitPerSync, now, now);

    return {
      id,
      url,
      name,
      enabled: true,
      limit_per_sync: limitPerSync,
      last_synced_at: null,
      last_position: 0,
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
    if (updates.limit_per_sync !== undefined) {
      fields.push("limit_per_sync = ?");
      values.push(updates.limit_per_sync);
    }
    if (updates.last_synced_at !== undefined) {
      fields.push("last_synced_at = ?");
      values.push(updates.last_synced_at);
    }
    if (updates.last_position !== undefined) {
      fields.push("last_position = ?");
      values.push(updates.last_position);
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
