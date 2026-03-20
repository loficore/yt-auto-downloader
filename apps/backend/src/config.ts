import { resolve, dirname } from 'path';
import { config as dotenvConfig } from 'dotenv';

const rootDir = resolve(dirname(import.meta.filename), '..', '..', '..');
dotenvConfig({ path: resolve(rootDir, '.env') });

/**
 * 应用配置接口
 */
export interface Config {
  /** 服务器端口 */
  port: number;
  /** 下载文件保存目录 */
  downloadDir: string;
  /** SQLite 数据库文件路径 */
  dbPath: string;
  /** 网络代理 */
  proxy: string | undefined;
  /** yt-dlp 专用代理 */
  ytDlpProxy: string | undefined;
  /** yt-dlp 浏览器 Cookie */
  ytDlpCookiesFromBrowser: string | undefined;
  /** yt-dlp Cookie 文件 */
  ytDlpCookiesFile: string | undefined;
  /** yt-dlp JavaScript runtime 配置 */
  ytDlpJsRuntimes: string | undefined;
  /** 每次同步最多下载数量 */
  maxDownloadsPerSync: number;
  /** 调度器是否启用 */
  schedulerEnabled: boolean;
  /** Cron 表达式 */
  schedulerCron: string;
  /** 时区 */
  timezone: string;
}

function getEnv(key: string, defaultValue?: string): string | undefined {
  return Bun.env[key] ?? defaultValue;
}

function getPort(): number {
  const port = getEnv('PORT');
  return port ? Number.parseInt(port, 10) : 3000;
}

export const config = {
  port: getPort(),
  downloadDir: getEnv('DOWNLOAD_DIR', './data'),
  dbPath: getEnv('DB_PATH', './data/downloads.db'),
  proxy: getEnv('PROXY'),
  ytDlpProxy: getEnv('YTDLP_PROXY'),
  ytDlpCookiesFromBrowser: getEnv('YTDLP_COOKIES_FROM_BROWSER'),
  ytDlpCookiesFile: getEnv('YTDLP_COOKIES_FILE'),
  ytDlpJsRuntimes: getEnv('YTDLP_JS_RUNTIMES'),
  maxDownloadsPerSync: Number.parseInt(getEnv('MAX_DOWNLOADS_PER_SYNC') || '10', 10),
  schedulerEnabled: getEnv('SCHEDULER_ENABLED', 'true') === 'true',
  schedulerCron: getEnv('SCHEDULER_CRON', '0 6 * * *'),
  timezone: getEnv('TIMEZONE', 'UTC'),
};

const cookieSource = config.ytDlpCookiesFile
  ? `文件: ${config.ytDlpCookiesFile}`
  : config.ytDlpCookiesFromBrowser
    ? `浏览器: ${config.ytDlpCookiesFromBrowser}`
    : '无';

console.log('[⚙️] 配置加载完成:', {
  port: config.port,
  downloadDir: config.downloadDir,
  proxy: config.proxy || '无',
  cookies: cookieSource,
  maxDownloadsPerSync: config.maxDownloadsPerSync,
  schedulerEnabled: config.schedulerEnabled,
  schedulerCron: config.schedulerCron,
  timezone: config.timezone,
});
