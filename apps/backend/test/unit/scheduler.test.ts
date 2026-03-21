import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Scheduler } from '../../src/services/Scheduler';
import type { DatabaseService } from '../../src/services/Database';
import type { DownloadQueue } from '../../src/services/DownloadQueue';

vi.mock('../../src/config', () => ({
  config: {
    schedulerEnabled: true,
    schedulerCron: '0 6 * * *',
    timezone: 'UTC',
  },
}));

vi.mock('@yt-auto-downloader/shared', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Scheduler', () => {
  let mockDb: Partial<DatabaseService>;
  let mockQueue: Partial<DownloadQueue>;
  let scheduler: Scheduler;

  beforeEach(() => {
    vi.useFakeTimers();

    mockDb = {
      getEnabledSubscriptions: vi.fn().mockReturnValue([]),
      updateSubscription: vi.fn(),
    };

    mockQueue = {
      syncPlaylist: vi.fn().mockResolvedValue({ added: 5, total: 10, downloaded: 3 }),
    };

    scheduler = new Scheduler(mockDb as DatabaseService, mockQueue as DownloadQueue);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('getStatus', () => {
    it('returns correct initial status', () => {
      const status = scheduler.getStatus();

      expect(status.enabled).toBe(true);
      expect(status.cronExpression).toBe('0 6 * * *');
      expect(status.timezone).toBe('UTC');
      expect(status.nextRunAt).toBeNull();
      expect(status.isRunning).toBe(false);
    });
  });

  describe('start', () => {
    it('sets isRunning to true when started', () => {
      scheduler.start();
      expect(scheduler.getStatus().isRunning).toBe(true);
    });

    it('does not start twice', () => {
      scheduler.start();
      scheduler.start();
      expect(scheduler.getStatus().isRunning).toBe(true);
    });
  });

  describe('stop', () => {
    it('clears the running state', () => {
      scheduler.start();
      scheduler.stop();
      expect(scheduler.getStatus().isRunning).toBe(false);
    });

    it('clears nextRunAt', () => {
      scheduler.start();
      scheduler.stop();
      expect(scheduler.getStatus().nextRunAt).toBeNull();
    });
  });

  describe('syncNow', () => {
    it('runs sync immediately', async () => {
      const mockSubscription = {
        id: 1,
        url: 'https://youtube.com/playlist?list=test',
        name: 'Test Playlist',
        enabled: true,
        limit_per_sync: 50,
        last_synced_at: null,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      mockDb.getEnabledSubscriptions = vi.fn().mockReturnValue([mockSubscription]);

      await scheduler.syncNow();

      expect(mockQueue.syncPlaylist).toHaveBeenCalledWith(mockSubscription.url, mockSubscription.limit_per_sync);
      expect(mockDb.updateSubscription).toHaveBeenCalledWith(mockSubscription.id, {
        last_synced_at: expect.any(Number),
      });
    });

    it('does nothing when no subscriptions exist', async () => {
      mockDb.getEnabledSubscriptions = vi.fn().mockReturnValue([]);

      await scheduler.syncNow();

      expect(mockQueue.syncPlaylist).not.toHaveBeenCalled();
    });
  });
});
