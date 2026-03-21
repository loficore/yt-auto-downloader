import { parseFile } from 'music-metadata';
import { execa } from 'execa';
import { existsSync, statSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { logger } from '@yt-auto-downloader/shared';

/**
 * 下载验证结果
 */
export interface VerifyResult {
  valid: boolean;
  reason?: string;
  fileSize?: number;
  duration?: number;
}

/**
 * 下载验证器 - 混合多层验证确保下载完整性
 */
export class DownloadVerifier {
  private downloadDir: string;

  constructor(downloadDir: string) {
    this.downloadDir = downloadDir;
  }

  /**
   * 验证下载文件完整性（混合方案）
   * @param url - 下载的 URL
   * @returns 验证结果
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
   * 验证下载并清理损坏文件
   * @param url - 下载的 URL
   * @returns 验证结果
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
   * @param url - 下载的 URL
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
   * 模板: ${downloadDir}/%(artist)s/%(title)s/%(title)s.opus
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
   * 递归查找匹配的文件
   */
  private findFiles(dir: string, videoId: string): string[] {
    const results: string[] = [];
    const { readdirSync, statSync } = require('fs');
    const { join } = require('path');

    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...this.findFiles(fullPath, videoId));
        } else if (entry.name.includes(videoId) || entry.name.endsWith('.opus') || entry.name.endsWith('.webm')) {
          results.push(fullPath);
        }
      }
    } catch {
      // Ignore permission errors
    }

    return results;
  }

  /**
   * 基础检查：文件存在 + 大小 > 100KB
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
