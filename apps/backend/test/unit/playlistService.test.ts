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

  describe('toVideoRecords', () => {
    it('converts playlist videos to video records', () => {
      const videos = [
        {
          id: 'video1',
          title: 'Video 1',
          artist: 'Artist 1',
          duration: 180,
          url: 'https://www.youtube.com/watch?v=video1',
          position: 0,
        },
        {
          id: 'video2',
          title: 'Video 2',
          artist: 'Artist 2',
          duration: null,
          url: 'https://www.youtube.com/watch?v=video2',
          position: 1,
        },
      ];

      const records = service.toVideoRecords('playlist123', videos);

      expect(records).toHaveLength(2);
      expect(records[0]).toEqual({
        id: 'video1',
        playlist_id: 'playlist123',
        title: 'Video 1',
        artist: 'Artist 1',
        duration: 180,
        downloaded: false,
        downloaded_at: null,
        position: 0,
      });
      expect(records[1]).toEqual({
        id: 'video2',
        playlist_id: 'playlist123',
        title: 'Video 2',
        artist: 'Artist 2',
        duration: null,
        downloaded: false,
        downloaded_at: null,
        position: 1,
      });
    });

    it('handles empty video array', () => {
      const records = service.toVideoRecords('playlist123', []);
      expect(records).toHaveLength(0);
    });

    it('sets downloaded to false for all records', () => {
      const videos = [
        {
          id: 'video1',
          title: 'Video 1',
          artist: 'Artist 1',
          duration: 60,
          url: 'https://www.youtube.com/watch?v=video1',
          position: 0,
        },
      ];

      const records = service.toVideoRecords('test', videos);
      expect(records[0].downloaded).toBe(false);
      expect(records[0].downloaded_at).toBeNull();
    });
  });

  describe('dispose', () => {
    it('clears innertube instance', () => {
      service.dispose();
      // No error should occur
    });
  });
});
