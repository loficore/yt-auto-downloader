import { describe, expect, it, beforeEach, vi } from 'vitest';
import { Elysia } from 'elysia';
import { createSchedulerAPI } from '../../src/api/scheduler';
import type { SchedulerStatus } from '../../src/services/Scheduler';

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
    debug: vi.fn(),
  },
}));

interface MockScheduler {
  getStatus(): SchedulerStatus;
  syncNow(): Promise<void>;
  start(): void;
  stop(): void;
}

function createMockScheduler(): MockScheduler {
  return {
    getStatus(): SchedulerStatus {
      return {
        enabled: true,
        cronExpression: '0 6 * * *',
        timezone: 'UTC',
        nextRunAt: Date.now() + 86400000,
        isRunning: true,
      };
    },
    async syncNow() {
      // mock sync
    },
    start() {},
    stop() {},
  };
}

async function requestJson(app: AppLike, req: Request): Promise<unknown> {
  const response = await app.handle(req);
  return response.json();
}

interface AppLike {
  handle(request: Request): Response | Promise<Response>;
}

describe('scheduler api', () => {
  let scheduler: MockScheduler;
  let app: AppLike;

  beforeEach(() => {
    scheduler = createMockScheduler();
    app = new Elysia().use(createSchedulerAPI({ scheduler: scheduler as never }));
  });

  it('GET /api/scheduler/status returns scheduler status', async () => {
    const json = (await requestJson(
      app,
      new Request('http://localhost/api/scheduler/status'),
    )) as { success: boolean; data: SchedulerStatus };

    expect(json.success).toBe(true);
    expect(json.data.enabled).toBe(true);
    expect(json.data.cronExpression).toBe('0 6 * * *');
    expect(json.data.timezone).toBe('UTC');
    expect(json.data.isRunning).toBe(true);
  });

  it('POST /api/scheduler/sync-now triggers sync', async () => {
    const syncNowSpy = vi.spyOn(scheduler, 'syncNow');

    const json = (await requestJson(
      app,
      new Request('http://localhost/api/scheduler/sync-now', {
        method: 'POST',
      }),
    )) as { success: boolean; data: { message: string } };

    expect(json.success).toBe(true);
    expect(json.data.message).toBe('Sync started');
    expect(syncNowSpy).toHaveBeenCalled();
  });

  it('GET /api/scheduler/status returns nextRunAt', async () => {
    const customScheduler = createMockScheduler();
    customScheduler.getStatus = () => ({
      enabled: true,
      cronExpression: '0 6 * * *',
      timezone: 'UTC',
      nextRunAt: 1700000000000,
      isRunning: true,
    });

    const customApp = new Elysia().use(createSchedulerAPI({ scheduler: customScheduler as never }));

    const json = (await requestJson(
      customApp,
      new Request('http://localhost/api/scheduler/status'),
    )) as { success: boolean; data: { nextRunAt: number | null } };

    expect(json.success).toBe(true);
    expect(json.data.nextRunAt).toBe(1700000000000);
  });

  describe('Edge cases', () => {
    it('handles scheduler with null nextRunAt', async () => {
      const customScheduler = createMockScheduler();
      customScheduler.getStatus = () => ({
        enabled: false,
        cronExpression: '0 6 * * *',
        timezone: 'UTC',
        nextRunAt: null,
        isRunning: false,
      });

      const customApp = new Elysia().use(createSchedulerAPI({ scheduler: customScheduler as never }));

      const json = (await requestJson(
        customApp,
        new Request('http://localhost/api/scheduler/status'),
      )) as { success: boolean; data: { nextRunAt: number | null } };

      expect(json.success).toBe(true);
      expect(json.data.nextRunAt).toBeNull();
      expect(json.data.enabled).toBe(false);
    });

    it('handles syncNow error gracefully', async () => {
      const errorScheduler = createMockScheduler();
      errorScheduler.syncNow = async () => {
        throw new Error('Sync failed');
      };

      const errorApp = new Elysia().use(createSchedulerAPI({ scheduler: errorScheduler as never }));

      const response = await errorApp.handle(
        new Request('http://localhost/api/scheduler/sync-now', {
          method: 'POST',
        })
      );

      expect(response.status).toBe(500);
    });

    it('returns 404 for unknown route', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/scheduler/unknown')
      );
      expect(response.status).toBe(404);
    });

    it('handles POST to status endpoint', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/scheduler/status', {
          method: 'POST',
        })
      );
      expect(response.status).toBe(404);
    });

    it('handles DELETE to sync-now endpoint', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/scheduler/sync-now', {
          method: 'DELETE',
        })
      );
      expect(response.status).toBe(404);
    });
  });
});
