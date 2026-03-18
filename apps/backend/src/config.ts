import { resolve, dirname } from 'path';
import { config as dotenvConfig } from 'dotenv';

const rootDir = resolve(dirname(import.meta.filename), '..', '..', '..');
dotenvConfig({ path: resolve(rootDir, '.env') });

export interface Config {
  port: number;
  downloadDir: string;
  dbPath: string;
  proxy: string | undefined;
  ytDlpProxy: string | undefined;
  ytDlpCookiesFromBrowser: string | undefined;
  ytDlpCookiesFile: string | undefined;
}

function getEnv(key: string, defaultValue?: string): string | undefined {
  return Bun.env[key] ?? defaultValue;
}

function getPort(): number {
  const port = getEnv('PORT');
  return port ? Number.parseInt(port, 10) : 3000;
}

export const config: Config = {
  port: getPort(),
  downloadDir: getEnv('DOWNLOAD_DIR', './data') as string,
  dbPath: getEnv('DB_PATH', './data/downloads.db') as string,
  proxy: getEnv('PROXY'),
  ytDlpProxy: getEnv('YTDLP_PROXY'),
  ytDlpCookiesFromBrowser: getEnv('YTDLP_COOKIES_FROM_BROWSER'),
  ytDlpCookiesFile: getEnv('YTDLP_COOKIES_FILE'),
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
});
