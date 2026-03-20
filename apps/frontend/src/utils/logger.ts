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

/**
 * 日志记录器类
 * 支持不同级别的日志输出，并可选地添加时间戳
 * 根据日志级别自动选择输出方法（console.log, console.warn, console.error）
 * 可通过环境变量 VITE_LOG_LEVEL 设置日志级别（DEBUG, INFO, WARN, ERROR）
 */
export interface LoggerConfig {
  /** 日志级别，默认为 INFO */
  level?: LogLevel;
  /** 是否启用时间戳，默认为 true */
  enableTimestamp?: boolean;
}

/**
 * 日志记录器类
 */
export class Logger {
  private currentLevel: LogLevel;
  private enableTimestamp: boolean;

  /**
   * 创建 Logger 实例
   * @param {LoggerConfig} config  日志配置选项
   */
  constructor(config: LoggerConfig = {}) {
    this.currentLevel = config.level ?? LogLevel.INFO;
    this.enableTimestamp = config.enableTimestamp ?? true;
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

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) return;

    const formatted = this.formatMessage(level, message, data);

    if (level >= LogLevel.ERROR) {
      console.error(formatted);
    } else if (level === LogLevel.WARN) {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  /**
   * 记录调试日志
   * @param {string} message 日志消息
   * @param {unknown} data 日志数据（可选）
   */
  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * 记录信息日志
   * @param {string} message 日志消息
   * @param {unknown} data 日志数据（可选）
   */
  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * 记录警告日志
   * @param {string} message 日志消息
   * @param {unknown} data 日志数据（可选）
   */
  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * 记录错误日志
   * @param {string} message 日志消息
   * @param {unknown} data 日志数据（可选）
   */
  error(message: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * 设置日志级别
   * @param {LogLevel} level 日志级别
   */
  setLevel(level: LogLevel): void {
    this.currentLevel = level;
    this.info("Log level changed", { level: LEVEL_STRINGS[level] });
  }
}

export const logger = new Logger({
  level: (() => {
    const env = import.meta.env.VITE_LOG_LEVEL?.toUpperCase();
    if (env === "DEBUG") return LogLevel.DEBUG;
    if (env === "WARN") return LogLevel.WARN;
    if (env === "ERROR") return LogLevel.ERROR;
    return LogLevel.INFO;
  })(),
});
