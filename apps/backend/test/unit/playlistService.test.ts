import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { PlaylistService } from '../../src/services/PlaylistService';

vi.mock('../../src/config', () => ({
  config: {
    proxy: undefined,
    ytDlpCookiesFile: undefined,
  },
}));

vi.mock('@yt-auto-downloader/shared', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PlaylistService', () => {
  let service: PlaylistService;

  beforeEach(() => {
    service = new PlaylistService();
  });

  afterEach(() => {
    service.dispose();
  });

  describe('extractPlaylistId', () => {
    it('extracts playlist ID from standard YouTube URL', () => {
      const url = 'https://www.youtube.com/playlist?list=PL1234567890ABCDEF';
      expect(service.extractPlaylistId(url)).toBe('PL1234567890ABCDEF');
    });

    it('extracts playlist ID from YouTube Music URL', () => {
      const url = 'https://music.youtube.com/playlist?list=RDCLAK5uy_k';
      expect(service.extractPlaylistId(url)).toBe('RDCLAK5uy_k');
    });

    it('extracts playlist ID from short URL format', () => {
      const url = 'https://youtube.com/playlist?list=PLABC123';
      expect(service.extractPlaylistId(url)).toBe('PLABC123');
    });

    it('extracts playlist ID from URL with additional params', () => {
      const url = 'https://www.youtube.com/watch?v=abc123&list=PLXYZ789&index=1';
      expect(service.extractPlaylistId(url)).toBe('PLXYZ789');
    });

    it('extracts playlist ID from music playlist path', () => {
      const url = 'https://music.youtube.com/music/playlist/PLMIX123';
      expect(service.extractPlaylistId(url)).toBe('PLMIX123');
    });

    it('returns null for invalid URL', () => {
      expect(service.extractPlaylistId('https://example.com')).toBeNull();
    });

    it('returns null for URL without playlist ID', () => {
      expect(service.extractPlaylistId('https://www.youtube.com/watch?v=abc123')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(service.extractPlaylistId('')).toBeNull();
    });

    it('handles playlist ID with underscore and dash', () => {
      const url = 'https://www.youtube.com/playlist?list=PL_test-123_ABC';
      expect(service.extractPlaylistId(url)).toBe('PL_test-123_ABC');
    });
  });

  describe('dispose', () => {
    it('clears innertube instance', () => {
      service.dispose();
      // No error should occur
    });
  });
});
