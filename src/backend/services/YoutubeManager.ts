import { execa } from 'execa';
import path from 'path';

const COOKIE_ERROR_KEYWORDS = [
  'cookies-from-browser',
  'could not find',
  'cookie',
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
  private proxy = Bun.env.PROXY || Bun.env.YTDLP_PROXY || 'socks5://127.0.0.1:7890';
  private callbacks: DownloadCallbacks = {};
  private progressRegex = /\[download\]\s+(\d+(?:\.\d+)?)%/;

  /**
   * 初始化 YoutubeManager
   * @param {string} dir - 下载目录
   * @param {DownloadCallbacks} callbacks - 下载回调
   */
  constructor(dir: string, callbacks?: DownloadCallbacks) {
    this.downloadDir = path.resolve(dir);
    this.callbacks = callbacks || {};
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
    const historyPath = path.join(this.downloadDir, 'history.txt');
    try {
      await Bun.file(historyPath).exists();
    } catch {
      // 文件不存在则自动创建
      await Bun.write(historyPath, '');
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
   * @returns {Promise<string[]>} yt-dlp cookies 参数
   */
  private async getCookieArgs(): Promise<string[]> {
    const userDefined = Bun.env.YTDLP_COOKIES_FROM_BROWSER;
    if (userDefined && userDefined.trim()) {
      return ['--cookies-from-browser', userDefined.trim()];
    }

    const home = Bun.env.HOME;
    if (!home) {
      return [];
    }

    const browserCandidates: { browser: string; hintPath: string }[] = [
      { browser: 'chrome', hintPath: path.join(home, '.config/google-chrome') },
      { browser: 'chromium', hintPath: path.join(home, '.config/chromium') },
      { browser: 'brave', hintPath: path.join(home, '.config/BraveSoftware/Brave-Browser') },
      { browser: 'edge', hintPath: path.join(home, '.config/microsoft-edge') },
      { browser: 'firefox', hintPath: path.join(home, '.mozilla/firefox') },
    ];

    for (const candidate of browserCandidates) {
      if (await this.pathExists(candidate.hintPath)) {
        return ['--cookies-from-browser', candidate.browser];
      }
    }

    return [];
  }

  /**
   * 判断是否为 cookies 相关错误
   * @param {string} errorText - 错误文本
   * @returns {boolean} 是否 cookies 错误
   */
  private isCookieError(errorText: string): boolean {
    const normalized = errorText.toLowerCase();
    return COOKIE_ERROR_KEYWORDS.some((keyword) => normalized.includes(keyword));
  }

  /**
   * 从日志行中提取下载进度
   * @param {string} line - 单行输出
   * @returns {number | null} 进度百分比
   */
  private extractProgress(line: string): number | null {
    const match = this.progressRegex.exec(line);
    if (!match) {
      return null;
    }

    const matchedProgress = match[1];
    if (!matchedProgress) {
      return null;
    }

    const progress = Number.parseFloat(matchedProgress);
    if (Number.isNaN(progress)) {
      return null;
    }

    return Math.max(0, Math.min(100, Math.floor(progress)));
  }

  /**
   * 解析未知错误为字符串
   * @param {unknown} error - 异常对象
   * @returns {string} 可读错误信息
   */
  private getErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error instanceof Error) {
      const execaError = error as Error & { stderr?: unknown; shortMessage?: unknown };
      if (typeof execaError.stderr === 'string' && execaError.stderr.trim()) {
        return execaError.stderr;
      }
      if (typeof execaError.shortMessage === 'string' && execaError.shortMessage.trim()) {
        return execaError.shortMessage;
      }
      return execaError.message;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error';
    }
  }

  /**
   * 执行 yt-dlp 并监听实时进度
   * @param {string} taskId - 任务 ID
   * @param {string[]} args - 命令参数
   */
  private async runYtDlp(taskId: string, args: string[]): Promise<void> {
    const subprocess = execa('yt-dlp', ['--newline', ...args]);

    const onChunk = (chunk: string | Buffer): void => {
      const text = chunk.toString();
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        const progress = this.extractProgress(line);
        if (progress !== null) {
          this.callbacks.onProgress?.(taskId, progress);
        }
      }
    };

    subprocess.stdout?.on('data', onChunk);
    subprocess.stderr?.on('data', onChunk);

    await subprocess;
  }

  /**
   * 下载音频
   * @param {string} taskId - 任务 ID
   * @param {DownloadTask} task - 下载任务
   */
  async downloadAudio(taskId: string, task: DownloadTask): Promise<void> {
    console.log(`[🚀] 正在处理: ${task.url} (ID: ${taskId})`);
    
    this.callbacks.onStart?.(taskId);

    try {
      await this.ensureHistoryFile();

      const cookieArgs = await this.getCookieArgs();
      const baseArgs = [
        '--proxy', this.proxy,
        '-f', 'ba',
        '-x', '--audio-format', 'mp3',
        '--audio-quality', '0',
        '--add-metadata',
        '--embed-thumbnail',
        '--download-archive', path.join(this.downloadDir, 'history.txt'),
        '-o', `${this.downloadDir}/%(artist)s - %(title)s.%(ext)s`,
        task.url,
      ];

      try {
        await this.runYtDlp(taskId, [
          ...cookieArgs,
          ...baseArgs,
        ]);
      } catch (error) {
        const errorMsg = this.getErrorMessage(error);
        if (cookieArgs.length > 0 && this.isCookieError(errorMsg)) {
          console.warn('[⚠️] cookies 读取失败，自动重试（不带 cookies）');
          await this.runYtDlp(taskId, baseArgs);
        } else {
          throw error;
        }
      }

      console.log(`[✅] 成功: ${task.url}`);
      this.callbacks.onSuccess?.(taskId);
      
    } catch (error: unknown) {
      const errorMsg = this.getErrorMessage(error);
      console.error(`[❌] 失败: ${task.url}`, errorMsg);
      this.callbacks.onError?.(taskId, errorMsg);
    }
  }

  /**
   * 取消下载
   * @param {string} taskId - 任务 ID
   */
  cancelDownload(taskId: string): void {
    // TODO: 实现后台进程取消逻辑
    console.log(`[⏹️] 取消下载: ${taskId}`);
  }
}
