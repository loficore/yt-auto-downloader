import { Database } from "bun:sqlite";
import { resolve, dirname } from "path";
import { mkdirSync } from "fs";
import type { DownloadStatus } from "@yt-auto-downloader/shared";

export interface TaskRecord {
  id: string;
  url: string;
  artist: string | null;
  title: string | null;
  album: string | null;
  status: DownloadStatus;
  progress: number;
  error: string | null;
  created_at: number;
  updated_at: number;
  file_path: string | null;
}

export class DatabaseService {
  private db: Database;
  private dbPath: string;

  constructor(dbPath: string = "./data/downloads.db") {
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
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    console.log("[💾] 数据库初始化完成:", this.dbPath);
  }

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

  loadTasks(): TaskRecord[] {
    const stmt = this.db.prepare(
      "SELECT * FROM tasks ORDER BY created_at DESC",
    );
    return stmt.all() as TaskRecord[];
  }

  deleteTask(id: string): void {
    const stmt = this.db.prepare("DELETE FROM tasks WHERE id = ?");
    stmt.run(id);
  }

  clearCompleted(): void {
    this.db.run("DELETE FROM tasks WHERE status = 'completed'");
  }

  getSetting(key: string): string | null {
    const stmt = this.db.prepare("SELECT value FROM settings WHERE key = ?");
    const row = stmt.get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  setSetting(key: string, value: string): void {
    const stmt = this.db.prepare(
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    );
    stmt.run(key, value);
  }

  close(): void {
    this.db.close();
  }
}
