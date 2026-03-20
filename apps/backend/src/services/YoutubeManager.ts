import { execa } from "execa";
import path, { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { config } from "../config";
import { logger } from "@yt-auto-downloader/shared";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const COOKIE_ERROR_KEYWORDS = [
  "cookies-from-browser",
  "could not find",
  "cookie",
];

/**
 * 下载任务接口
 */
export interface DownloadTask {
  /** youtube链接 */
  url: string;
  /** 艺术家名称（可选） */
  artist?: string;
}

/**
 * 下载回调接口
 */
export interface DownloadCallbacks {
  /** 下载开始回调 */
  onStart?: (taskId: string) => void;
  /** 下载进度回调 */
  onProgress?: (taskId: string, progress: number) => void;
  /** 下载成功回调 */
  onSuccess?: (taskId: string) => void;
  /** 下载错误回调 */
  onError?: (taskId: string, error: string) => void;
}

/**
 * YouTube 下载管理器
 */
export class YoutubeManager {
  private downloadDir: string;
  private proxy: string | undefined;
  private cookieBrowser: string | undefined;
  private cookieFile: string | undefined;
  private ytDlpJsRuntimes: string | undefined;
  private callbacks: DownloadCallbacks = {};
  private progressRegex = /\[download\]\s+(\d+(?:\.\d+)?)%/;
  private itemRegex = /\[download\]\s+Downloading item (\d+) of (\d+)/;

  /**
   * 初始化 YoutubeManager
   * @param {string} dir - 下载目录
   * @param {DownloadCallbacks} callbacks - 下载回调
   */
  constructor(dir: string, callbacks?: DownloadCallbacks) {
    this.downloadDir = path.resolve(dir);
    this.proxy = config.proxy || config.ytDlpProxy;
    this.cookieBrowser = config.ytDlpCookiesFromBrowser;
    this.cookieFile = config.ytDlpCookiesFile;
    this.ytDlpJsRuntimes = config.ytDlpJsRuntimes;
    if (this.proxy) {
      logger.info("Using proxy", { proxy: this.proxy });
    } else {
      logger.info("No proxy configured, direct download");
    }
    if (this.cookieFile) {
      logger.info("Cookie file configured", { cookieFile: this.cookieFile });
    } else if (this.cookieBrowser) {
      logger.info("Cookie browser configured", { cookieBrowser: this.cookieBrowser });
    } else {
      logger.info("No cookie configured");
    }
    logger.info("yt-dlp JavaScript runtimes configured", {
      runtimes: this.getResolvedJsRuntime(),
    });
    this.callbacks = callbacks || {};
  }

  /**
   * 获取 yt-dlp JS runtime 参数值
   * @returns {string | undefined} 运行时参数
   */
  private getResolvedJsRuntime(): string | undefined {
    if (this.ytDlpJsRuntimes && this.ytDlpJsRuntimes.trim()) {
      return this.ytDlpJsRuntimes.trim();
    }

    const bunPath = Bun.which("bun");
    if (bunPath) {
      return `bun:${bunPath}`;
    }

    return undefined;
  }

  /**
   * 获取 yt-dlp JS runtime 参数
   * @returns {string[]} yt-dlp JS runtime 参数
   */
  private getJsRuntimeArgs(): string[] {
    const runtime = this.getResolvedJsRuntime();
    if (!runtime) {
      return [];
    }
    return ["--js-runtimes", runtime];
  }

  /**
   * 设置回调函数
   * @param {DownloadCallbacks} callbacks - 回调对象
   */
  setCallbacks(callbacks: DownloadCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * 确保历史文件存在
   */
  private async ensureHistoryFile(): Promise<void> {
    const historyPath = path.join(this.downloadDir, "history.txt");
    try {
      await Bun.file(historyPath).exists();
    } catch {
      await Bun.write(historyPath, "");
    }
  }

  /**
   * 检查路径是否存在
   * @param {string} targetPath - 目标路径
   * @returns {Promise<boolean>} 是否存在
   */
  private async pathExists(targetPath: string): Promise<boolean> {
    try {
      return await Bun.file(targetPath).exists();
    } catch {
      return false;
    }
  }

  /**
   * 获取可用的 cookies 参数
   * @returns {string[]} yt-dlp cookies 参数
   */
  private getCookieArgs(): string[] {
    // 优先使用 cookies 文件
    if (this.cookieFile && this.cookieFile.trim()) {
      const cookiePath = path.isAbsolute(this.cookieFile.trim())
        ? this.cookieFile.trim()
        : path.resolve(rootDir, this.cookieFile.trim());
      logger.info("Using cookie file", { path: cookiePath });
      return ["--cookies", cookiePath];
    }

    // 其次使用浏览器 cookies
    if (this.cookieBrowser && this.cookieBrowser.trim()) {
      const browser = this.cookieBrowser.trim().toLowerCase();
      logger.info("Using browser cookie", { browser });
      return ["--cookies-from-browser", browser];
    }

    logger.info("No cookie configured, direct download");
    return [];
  }

  /**
   * 判断是否为 cookies 相关错误
   * @param {string} errorText - 错误文本
   * @returns {boolean} 是否 cookies 错误
   */
  private isCookieError(errorText: string): boolean {
    const normalized = errorText.toLowerCase();
    return COOKIE_ERROR_KEYWORDS.some((keyword) =>
      normalized.includes(keyword),
    );
  }

  /**
   * 从日志行中提取下载进度
   * @param {string} line - 单行输出
   * @returns {number | null} 进度百分比
   */
  private extractProgress(line: string): number | null {
    // 匹配: [download] 50.5%
    const match = this.progressRegex.exec(line);
    if (match && match[1]) {
      const progress = Number.parseFloat(match[1]);
      if (!Number.isNaN(progress)) {
        return Math.max(0, Math.min(100, Math.floor(progress)));
      }
    }

    // 匹配播放列表项: [download] Downloading item 1 of 10
    const itemMatch = this.itemRegex.exec(line);
    if (itemMatch && itemMatch[1] && itemMatch[2]) {
      const current = Number.parseInt(itemMatch[1], 10);
      const total = Number.parseInt(itemMatch[2], 10);
      if (current && total) {
        return Math.floor((current / total) * 100);
      }
    }

    return null;
  }

  /**
   * 解析未知错误为字符串
   * @param {unknown} error - 异常对象
   * @returns {string} 可读错误信息
   */
  private getErrorMessage(error: unknown): string {
    if (typeof error === "string") {
      return error;
    }

    if (error instanceof Error) {
      const execaError = error as Error & {
        stderr?: unknown;
        shortMessage?: unknown;
      };
      if (typeof execaError.stderr === "string" && execaError.stderr.trim()) {
        return execaError.stderr;
      }
      if (
        typeof execaError.shortMessage === "string" &&
        execaError.shortMessage.trim()
      ) {
        return execaError.shortMessage;
      }
      return execaError.message;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown error";
    }
  }

  /**
   * 执行 yt-dlp 并监听实时进度
   * @param {string} taskId - 任务 ID
   * @param {string[]} args - 命令参数
   */
  private async runYtDlp(taskId: string, args: string[]): Promise<void> {
    const subprocess = execa("yt-dlp", ["--newline", ...args]);

    const onChunk = (chunk: string | Buffer): void => {
      const text = chunk.toString();
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        if (line.trim()) {
          logger.info(`[yt-dlp] ${line}`);
        }
        const progress = this.extractProgress(line);
        if (progress !== null) {
          this.callbacks.onProgress?.(taskId, progress);
        }
      }
    };

    subprocess.stdout?.on("data", onChunk);
    subprocess.stderr?.on("data", onChunk);

    await subprocess;
  }

  /**
   * 下载音频
   * @param {string} taskId - 任务 ID
   * @param {DownloadTask} task - 下载任务
   */
  async downloadAudio(taskId: string, task: DownloadTask): Promise<void> {
    logger.info("Starting download", { url: task.url, taskId });

    this.callbacks.onStart?.(taskId);

    try {
      await this.ensureHistoryFile();

      const cookieArgs = this.getCookieArgs();
      const jsRuntimeArgs = this.getJsRuntimeArgs();
      const baseArgs: string[] = [];
      
      if (this.proxy) {
        baseArgs.push("--proxy", this.proxy);
      }
      
      // Opus format with lyrics support
      // Output: Downloads/Artist/Title/Title.opus
      baseArgs.push(
        ...jsRuntimeArgs,
        "-f", "ba",
        "-x", "--audio-format", "opus",
        "--add-metadata",
        "--embed-thumbnail",
        "--write-subs",
        "--write-auto-subs",
        "--download-archive",
        path.join(this.downloadDir, "history.txt"),
        "-o",
        `${this.downloadDir}/%(artist)s/%(title)s/%(title)s.%(ext)s`,
        task.url
      );

      try {
        await this.runYtDlp(taskId, [...cookieArgs, ...baseArgs]);
      } catch (error) {
        const errorMsg = this.getErrorMessage(error);
        if (cookieArgs.length > 0 && this.isCookieError(errorMsg)) {
          logger.warn("Cookie read failed, retrying without cookies", { error: errorMsg });
          await this.runYtDlp(taskId, baseArgs);
        } else {
          throw error;
        }
      }

      logger.info("Download completed", { url: task.url, taskId });
      this.callbacks.onSuccess?.(taskId);
    } catch (error: unknown) {
      const errorMsg = this.getErrorMessage(error);
      logger.error("Download failed", { url: task.url, error: errorMsg });
      this.callbacks.onError?.(taskId, errorMsg);
    }
  }

  /**
   * 取消下载
   * @param {string} taskId - 任务 ID
   */
  cancelDownload(taskId: string): void {
    logger.info("Download cancelled", { taskId });
  }
}
