import { Innertube } from "youtubei.js";
import { readFileSync } from "fs";
import { dirname, resolve, isAbsolute } from "path";
import { fileURLToPath } from "url";
import { config } from "../config";
import { logger } from "@yt-auto-downloader/shared";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/**
 * 播放列表视频信息
 */
export interface PlaylistVideo {
  /** 视频ID */
  id: string;
  /** 视频标题 */
  title: string;
  /** 艺术家/频道名 */
  artist: string;
  /** 视频时长（秒） */
  duration: number | null;
  /** 视频URL */
  url: string;
  /** 在播放列表中的位置 */
  position: number;
}

/**
 * 播放列表信息
 */
export interface PlaylistInfo {
  /** 播放列表ID */
  id: string;
  /** 播放列表标题 */
  title: string;
  /** 视频列表 */
  videos: PlaylistVideo[];
}

/**
 * 播放列表服务
 * 使用 youtubei.js 获取播放列表信息
 */
export class PlaylistService {
  private innertube: Innertube | null = null;

  /**
   * 获取或创建 Innertube 实例
   * @returns {Promise<Innertube>} Innertube 实例
   */
  private async getInnertube(): Promise<Innertube> {
    if (!this.innertube) {
      const options: {
        proxy?: string;
        cookie?: string;
      } = {};

      if (config.proxy) {
        options.proxy = config.proxy;
      }

      if (config.ytDlpCookiesFile) {
        try {
          const cookiePath = isAbsolute(config.ytDlpCookiesFile)
            ? config.ytDlpCookiesFile
            : resolve(rootDir, config.ytDlpCookiesFile);
          const cookieContent = readFileSync(cookiePath, "utf-8");
          const cookieHeader = this.parseNetscapeCookies(cookieContent);
          options.cookie = cookieHeader;
          logger.info("Cookie file loaded", { path: cookiePath });
        } catch (error) {
          logger.warn("Failed to read cookie file", { error });
        }
      }

      this.innertube = await Innertube.create(options);
      logger.info("PlaylistService initialized");
    }

    return this.innertube;
  }

  private parseNetscapeCookies(content: string): string {
    const lines = content.split("\n");
    const cookies: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || trimmed === "") continue;

      const parts = trimmed.split("\t");
      if (parts.length >= 7) {
        const name = parts[5];
        const value = parts[6];
        if (name && value) {
          cookies.push(`${name}=${value}`);
        }
      }
    }

    return cookies.join("; ");
  }

  /**
   * 从 URL 中提取播放列表ID
   * @param {string} url 播放列表URL
   * @returns {string | null} 播放列表ID
   */
  extractPlaylistId(url: string): string | null {
    const patterns = [
      /[?&]list=([a-zA-Z0-9_-]+)/,
      /\/playlist\?list=([a-zA-Z0-9_-]+)/,
      /\/music\/playlist\/([a-zA-Z0-9_-]+)/i,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * 获取播放列表信息
   * @param {string} urlOrId 播放列表URL或ID
   * @returns {Promise<PlaylistInfo | null>} 播放列表信息
   */
  async getPlaylist(urlOrId: string): Promise<PlaylistInfo | null> {
    try {
      const yt = await this.getInnertube();

      let playlistId = urlOrId;
      if (urlOrId.includes("http") || urlOrId.includes("youtube.com") || urlOrId.includes("music.youtube.com")) {
        playlistId = this.extractPlaylistId(urlOrId) || urlOrId;
      }

      if (!playlistId || playlistId === urlOrId && !urlOrId.includes("PL")) {
        logger.error("Failed to extract playlist ID from URL", { url: urlOrId });
        return null;
      }

      logger.info("Fetching playlist", { playlistId });

      const playlist = await yt.getPlaylist(playlistId);

      if (!playlist) {
        logger.error("Failed to get playlist", { playlistId });
        return null;
      }

      const videos: PlaylistVideo[] = [];
      let position = 0;

      for (const item of playlist.items) {
        const video = item as {
          id: string;
          title?: { text?: string };
          author?: { name?: { text?: string } };
          channelTitle?: string;
          shortBylineText?: { text?: string }[];
          duration?: { seconds?: number };
        };

        if (video.id) {
          // 尝试多个字段获取艺术家名称
          const artist =
            video.author?.name?.text ||
            video.channelTitle ||
            (video.shortBylineText && video.shortBylineText[0]?.text) ||
            "Unknown";

          videos.push({
            id: video.id,
            title: video.title?.text || "Unknown",
            artist,
            duration: video.duration?.seconds || null,
            url: `https://www.youtube.com/watch?v=${video.id}`,
            position: position++,
          });
        }
      }

      const title = (playlist as { title?: { text?: string } }).title?.text || "Unknown Playlist";

      logger.info("Playlist fetched", { title, videoCount: videos.length });

      return {
        id: playlistId,
        title,
        videos,
      };
    } catch (error) {
      logger.error("Failed to get playlist", { error });
      return null;
    }
  }

  /**
   * 关闭服务
   */
  dispose(): void {
    this.innertube = null;
  }
}
