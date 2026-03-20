import { mkdir, writeFile, readdir, rm, stat } from "fs/promises";
import { existsSync, createWriteStream, statSync } from "fs";
import { dirname, join, resolve, isAbsolute } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..", "..", "..");

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const LEVEL_STRINGS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: "DEBUG",
  [LogLevel.INFO]: "INFO",
  [LogLevel.WARN]: "WARN",
  [LogLevel.ERROR]: "ERROR",
};

const LEVEL_EMOJIS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: "🐛",
  [LogLevel.INFO]: "ℹ️",
  [LogLevel.WARN]: "⚠️",
  [LogLevel.ERROR]: "❌",
};

export interface LoggerConfig {
  /** 日志目录路径 */
  logDir?: string;
  /** 日志文件名（不含扩展名） */
  logFilename?: string;
  /** 单个日志文件最大大小（字节），超过后轮转 */
  maxFileSize?: number;
  /** 最多保留的日志文件数量 */
  maxFileCount?: number;
  /** 日志输出等级 */
  level?: LogLevel;
  /** 是否启用时间戳 */
  enableTimestamp?: boolean;
}

export class Logger {
  private currentLevel: LogLevel;
  private enableTimestamp: boolean;
  private logDir: string;
  private logFilename: string;
  private maxFileSize: number;
  private maxFileCount: number;
  private logFilePath: string | null = null;
  private writeStream: ReturnType<typeof createWriteStream> | null = null;
  private isNode: boolean;

  constructor(config: LoggerConfig = {}) {
    this.currentLevel = config.level ?? LogLevel.INFO;
    this.enableTimestamp = config.enableTimestamp ?? true;
    this.logDir = config.logDir ?? "./logs";
    this.logFilename = config.logFilename ?? "app";
    this.maxFileSize = config.maxFileSize ?? 10 * 1024 * 1024;
    this.maxFileCount = config.maxFileCount ?? 5;
    this.isNode = typeof window === "undefined";

    if (this.isNode) {
      this.initFileLogging().catch((err) => {
        console.error("Failed to initialize file logging:", err);
      });
    }
  }

  private formatDateString(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  private async initFileLogging(): Promise<void> {
    try {
      let logDir = this.logDir;
      if (!isAbsolute(logDir)) {
        logDir = resolve(rootDir, logDir);
      }
      await mkdir(logDir, { recursive: true });

      const dateStr = this.formatDateString();
      this.logFilePath = join(logDir, `${this.logFilename}.${dateStr}.log`);

      this.writeStream = createWriteStream(this.logFilePath, { flags: "a" });
      this.info("Logger initialized", { logFile: this.logFilePath });
    } catch (error) {
      console.error("Failed to init file logging:", error);
    }
  }

  private async checkRotation(): Promise<void> {
    if (!this.logFilePath || !existsSync(this.logFilePath)) return;

    try {
      const stats = statSync(this.logFilePath);
      if (stats.size >= this.maxFileSize) {
        await this.rotateLogFile();
      }
    } catch {
      // ignore
    }
  }

  private async rotateLogFile(): Promise<void> {
    if (!this.logFilePath) return;

    try {
      this.writeStream?.end();

      const dir = dirname(this.logFilePath);
      const baseName = this.logFilename;

      // Shift existing rotated files
      for (let i = this.maxFileCount; i >= 1; i--) {
        const src = join(dir, `${baseName}.log.${i}`);
        const dst = join(dir, `${baseName}.log.${i + 1}`);
        if (existsSync(src)) {
          await rm(dst, { force: true }).catch(() => {});
          await rm(src);
        }
      }

      // Rename current log to .1
      await rm(join(dir, `${baseName}.log.1`), { force: true }).catch(() => {});
      await rm(this.logFilePath);

      // Clean old files beyond max count
      for (let i = this.maxFileCount + 1; i < 20; i++) {
        await rm(join(dir, `${baseName}.log.${i}`), { force: true }).catch(() => {});
      }

      this.writeStream = createWriteStream(this.logFilePath, { flags: "a" });
    } catch (error) {
      console.error("Failed to rotate log file:", error);
    }
  }

  private formatTimestamp(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${now.getMilliseconds().toString().padStart(3, "0")}`;
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = this.enableTimestamp ? `[${this.formatTimestamp()}] ` : "";
    const levelStr = `[${LEVEL_STRINGS[level]}]`;
    const emoji = LEVEL_EMOJIS[level];
    let result = `${timestamp}${levelStr} ${emoji} ${message}`;
    if (data !== undefined) {
      try {
        result += ` ${JSON.stringify(data)}`;
      } catch {
        result += ` [unserializable data]`;
      }
    }
    return result;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLevel;
  }

  private async log(level: LogLevel, message: string, data?: unknown): Promise<void> {
    if (!this.shouldLog(level)) return;

    const formatted = this.formatMessage(level, message, data);

    // Console output
    if (level >= LogLevel.ERROR) {
      console.error(formatted);
    } else if (level === LogLevel.WARN) {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }

    // File output (Node.js only)
    if (this.isNode && this.writeStream) {
      await this.checkRotation();
      this.writeStream.write(formatted + "\n");
    }
  }

  debug(message: string, data?: unknown): void {
    void this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: unknown): void {
    void this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: unknown): void {
    void this.log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: unknown): void {
    void this.log(LogLevel.ERROR, message, data);
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
    this.info("Log level changed", { level: LEVEL_STRINGS[level] });
  }

  setTimestamp(enable: boolean): void {
    this.enableTimestamp = enable;
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.writeStream) {
        this.writeStream.end(() => {
          this.writeStream = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export const logger = new Logger({
  logDir: process.env.LOG_DIR ?? "./logs",
  logFilename: process.env.LOG_FILENAME ?? "yt-downloader",
  maxFileSize: 10 * 1024 * 1024,
  maxFileCount: 5,
  level: (() => {
    const env = process.env.LOG_LEVEL?.toUpperCase();
    if (env === "DEBUG") return LogLevel.DEBUG;
    if (env === "WARN") return LogLevel.WARN;
    if (env === "ERROR") return LogLevel.ERROR;
    return LogLevel.INFO;
  })(),
});
