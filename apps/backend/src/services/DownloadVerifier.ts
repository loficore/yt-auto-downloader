import { parseFile } from 'music-metadata';
import { execa } from 'execa';
import { existsSync, statSync, unlinkSync, readdirSync, writeFileSync } from 'fs';
import { join, extname } from 'path';
import { logger } from '@yt-auto-downloader/shared';

/**
 * 下载验证结果
 */
export interface VerifyResult {
  /** 验证是否通过 */
  valid: boolean;
  /** 验证失败原因 */
  reason?: string;
  /** 文件大小 */
  fileSize?: number;
  /** 持续时间 */
  duration?: number;
}

/**
 * 下载验证器 - 混合多层验证确保下载完整性
 */
export class DownloadVerifier {
  private downloadDir: string;
  private readonly audioExtensions = new Set(['.opus', '.m4a', '.webm', '.mp3']);

  /**
   * 构造函数
   * @param {string} downloadDir 下载目录路径
   */
  constructor(downloadDir: string) {
    this.downloadDir = downloadDir;
  }

  /**
   * 验证下载文件完整性（混合方案）
   * @param {string} url - 下载的 URL
   * @returns {Promise<VerifyResult>} 验证结果
   */
  async verify(url: string): Promise<VerifyResult> {
    const filePath = this.resolveFilePath(url);

    if (!filePath) {
      return { valid: false, reason: 'Cannot resolve file path from URL' };
    }

    logger.info('Verifying download', { filePath, url });

    if (!await this.basicCheck(filePath)) {
      return { valid: false, reason: 'Basic check failed: file not found or too small' };
    }

    const stats = statSync(filePath);

    if (await this.ffprobeCheck(filePath)) {
      logger.info('Verification passed (ffprobe)', { filePath });
      return { valid: true, fileSize: stats.size };
    }

    if (await this.metadataCheck(filePath)) {
      logger.info('Verification passed (music-metadata)', { filePath });
      return { valid: true, fileSize: stats.size };
    }

    logger.warn('Verification failed', { filePath });
    return { valid: false, reason: 'All verification methods failed' };
  }

  /**
   * 快速验证下载文件完整性（archive 命中场景）
   * 仅执行基础检查 + ffprobe，避免额外解析开销
   * @param {string} url - 下载的 URL
   * @returns {Promise<VerifyResult>} 验证结果
   */
  async quickVerify(url: string): Promise<VerifyResult> {
    const filePath = this.resolveFilePath(url);

    if (!filePath) {
      return { valid: false, reason: 'Cannot resolve file path from URL' };
    }

    logger.info('Quick verifying download', { filePath, url });

    if (!await this.basicCheck(filePath)) {
      return { valid: false, reason: 'Basic check failed: file not found or too small' };
    }

    const stats = statSync(filePath);

    if (await this.ffprobeCheck(filePath)) {
      logger.info('Quick verification passed (ffprobe)', { filePath });
      return { valid: true, fileSize: stats.size };
    }

    logger.warn('Quick verification failed', { filePath });
    return { valid: false, reason: 'Quick verification failed (ffprobe)' };
  }

  /**
   * 快速验证并清理损坏文件（archive 命中场景）
   * @param {string} url - 下载的 URL
   * @returns {Promise<VerifyResult>} 验证结果
   */
  async quickVerifyAndCleanup(url: string): Promise<VerifyResult> {
    const result = await this.quickVerify(url);

    if (!result.valid) {
      await this.deleteCorruptedFile(url);
    }

    return result;
  }

  /**
   * 启动时重建 yt-dlp 下载归档
   * 扫描下载目录，保留可通过快速校验的文件，删除明显损坏文件
   * @param {string} historyPath - history.txt 路径
   * @returns {Promise<{ total: number; valid: number; removed: number }>} 重建统计
   */
  async rebuildArchive(historyPath: string): Promise<{ total: number; valid: number; removed: number }> {
    const candidates = this.collectArchiveCandidates(this.downloadDir);
    const validIds = new Set<string>();
    let removed = 0;

    for (const candidate of candidates) {
      const isValid = await this.quickVerifyFile(candidate.filePath);
      if (isValid) {
        validIds.add(candidate.videoId);
        continue;
      }

      try {
        unlinkSync(candidate.filePath);
        removed++;
        logger.warn('Removed corrupted file during archive rebuild', {
          filePath: candidate.filePath,
          videoId: candidate.videoId,
        });
      } catch (error) {
        logger.error('Failed to remove corrupted file during archive rebuild', {
          filePath: candidate.filePath,
          videoId: candidate.videoId,
          error,
        });
      }
    }

    const lines = Array.from(validIds).map((videoId) => `youtube ${videoId}`);
    writeFileSync(historyPath, lines.length > 0 ? `${lines.join('\n')}\n` : '', 'utf-8');

    logger.info('Archive rebuilt from local files', {
      historyPath,
      scanned: candidates.length,
      valid: validIds.size,
      removed,
    });

    return {
      total: candidates.length,
      valid: validIds.size,
      removed,
    };
  }

  /**
   * 验证下载并清理损坏文件
   * @param {string} url - 下载的 URL
   * @returns {Promise<VerifyResult>} 验证结果
   */
  async verifyAndCleanup(url: string): Promise<VerifyResult> {
    const result = await this.verify(url);

    if (!result.valid) {
      await this.deleteCorruptedFile(url);
    }

    return result;
  }

  /**
   * 删除损坏的文件
   * @param {string} url - 下载的 URL
   */
  private async deleteCorruptedFile(url: string): Promise<void> {
    const filePath = this.resolveFilePath(url);

    if (!filePath) {
      logger.warn('Cannot resolve file path for cleanup', { url });
      return;
    }

    if (!existsSync(filePath)) {
      return;
    }

    try {
      unlinkSync(filePath);
      logger.info('Deleted corrupted file', { filePath, url });
    } catch (error) {
      logger.error('Failed to delete corrupted file', { filePath, url, error });
    }
  }

  /**
   * 从 URL 解析预期文件路径
   * 模板: ${downloadDir}/%(artist)s/%(title)s (%(id)s)/%(title)s.opus
   * @param {string} url - 下载的 URL
   * @returns {string | null} 解析出的文件路径，或 null 如果无法解析
   */
  private resolveFilePath(url: string): string | null {
    const videoIdMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
    if (!videoIdMatch) {
      return null;
    }

    const videoId = videoIdMatch[1];
    if (!videoId) {
      return null;
    }

    const files = this.findFiles(this.downloadDir, videoId);
    if (files.length > 0 && files[0]) {
      return files[0];
    }

    return null;
  }

  /**
   * 快速验证单个文件路径
   * @param {string} filePath - 文件路径
   * @returns {Promise<boolean>} 是否通过基础与 ffprobe 检查
   */
  private async quickVerifyFile(filePath: string): Promise<boolean> {
    if (!await this.basicCheck(filePath)) {
      return false;
    }
    return this.ffprobeCheck(filePath);
  }

  /**
   * 收集可用于构建归档的候选音频文件
   * 约定目录名包含视频ID，例如: Title (dQw4w9WgXcQ)
   * @param {string} rootDir - 扫描根目录
   * @returns {{ videoId: string; filePath: string }[]} 候选文件
   */
  private collectArchiveCandidates(rootDir: string): { videoId: string; filePath: string }[] {
    const results: { videoId: string; filePath: string }[] = [];

    const walk = (dir: string, inheritedVideoId?: string): void => {
      let entries: { name: string; isDirectory(): boolean }[];
      try {
        entries = readdirSync(dir, {
          withFileTypes: true,
          encoding: 'utf-8',
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

        results.push({
          videoId: inheritedVideoId,
          filePath: fullPath,
        });
      }
    };

    walk(rootDir);
    return results;
  }

  /**
   * 查找下载目录中的文件
   * 根据新的文件结构: {downloadDir}/{artist}/{title} ({videoId})/{title}.ext
   * @param {string} dir - 目录路径
   * @param {string} videoId - 视频 ID 用于匹配文件夹名称
   * @returns {string[]} 匹配的文件路径列表
   */
  private findFiles(dir: string, videoId: string): string[] {
    const results: string[] = [];

    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          // 如果目录名包含视频ID，则查找该目录中的音频文件
          if (entry.name.includes(`(${videoId})`)) {
            const subEntries = readdirSync(fullPath);
            for (const subEntry of subEntries) {
              const extension = extname(subEntry).toLowerCase();
              if (this.audioExtensions.has(extension)) {
                results.push(join(fullPath, subEntry));
              }
            }
          } else {
            // 否则继续递归搜索
            results.push(...this.findFiles(fullPath, videoId));
          }
        }
      }
    } catch {
      // Ignore permission errors
    }

    return results;
  }

  /**
   * 基础检查：文件存在 + 大小 > 100KB
   * @param {string} filePath - 文件路径
   * @returns {Promise<boolean>} 是否通过基础检查
   */
  private async basicCheck(filePath: string): Promise<boolean> {
    try {
      if (!existsSync(filePath)) {
        logger.warn('File does not exist', { filePath });
        return false;
      }

      const stats = statSync(filePath);
      if (stats.size < 100_000) {
        logger.warn('File too small', { filePath, size: stats.size });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Basic check error', { filePath, error });
      return false;
    }
  }

  /**
   * ffprobe 验证（推荐，更可靠）
   * @param {string} filePath - 文件路径
   * @returns {Promise<boolean>} 是否通过 ffprobe 验证
   */
  private async ffprobeCheck(filePath: string): Promise<boolean> {
    try {
      const result = await execa('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration,size',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        filePath,
      ], {
        reject: false,
      });

      if (result.exitCode !== 0) {
        logger.warn('ffprobe check failed', { filePath, exitCode: result.exitCode });
        return false;
      }

      const output = result.stdout.trim();
      if (!output) {
        logger.warn('ffprobe no output', { filePath });
        return false;
      }

      const lines = output.split('\n');
      const duration = Number.parseFloat(lines[0] || '0');

      if (duration <= 0) {
        logger.warn('ffprobe invalid duration', { filePath, duration });
        return false;
      }

      logger.info('ffprobe check passed', { filePath, duration });
      return true;
    } catch (error) {
      logger.warn('ffprobe not available', { filePath, error });
      return false;
    }
  }

  /**
   * music-metadata 验证（降级方案）
   * @param {string} filePath - 文件路径
   * @returns {Promise<boolean>} 是否通过 music-metadata 验证
   */
  private async metadataCheck(filePath: string): Promise<boolean> {
    try {
      const metadata = await parseFile(filePath);

      const duration = metadata.format.duration;
      const sampleRate = metadata.format.sampleRate;

      if (!duration || duration <= 0) {
        logger.warn('metadata: invalid duration', { filePath, duration });
        return false;
      }

      if (!sampleRate || sampleRate < 8000) {
        logger.warn('metadata: invalid sample rate', { filePath, sampleRate });
        return false;
      }

      logger.info('metadata check passed', { filePath, duration, sampleRate });
      return true;
    } catch (error) {
      logger.error('metadata check error', { filePath, error });
      return false;
    }
  }
}
