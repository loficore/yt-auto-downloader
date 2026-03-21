import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { Elysia } from 'elysia';
import { DownloadQueue } from '../../src/services/DownloadQueue';
import { EventEmitter } from '../../src/services/EventEmitter';
import { DatabaseService } from '../../src/services/Database';
import { createDownloadAPI } from '../../src/api/download';
import { createSubscriptionsAPI } from '../../src/api/subscriptions';
import { createSchedulerAPI } from '../../src/api/scheduler';

vi.mock('../../src/config', () => ({
  config: {
    port: 3000,
    downloadDir: './data/Downloads',
    dbPath: './data/test.db',
    schedulerEnabled: false,
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

interface AppLike {
  handle(request: Request): Response | Promise<Response>;
}

describe('Server Integration', () => {
  let app: AppLike;
  let db: DatabaseService;
  let queue: DownloadQueue;
  let emitter: EventEmitter;

  beforeEach(async () => {
    const testDbPath = './data/test-server.db';
    try {
      await Bun.file(testDbPath).delete();
    } catch {}

    db = new DatabaseService(testDbPath);
    queue = new DownloadQueue('./data/Downloads', 1, db);
    emitter = new EventEmitter();

    queue.setCallbacks({
      onTaskUpdated: () => {},
      onQueueChanged: () => {},
    });

    const mockScheduler = {
      getStatus() {
        return {
          enabled: false,
          cronExpression: '0 6 * * *',
          timezone: 'UTC',
          nextRunAt: null,
          isRunning: false,
        };
      },
      start() {},
      stop() {},
      syncNow: async () => {},
    } as unknown as import('../../src/services/Scheduler').Scheduler;

    app = new Elysia()
      .get('/health', () => ({
        status: 'ok',
        timestamp: new Date().toISOString(),
      }))
      .use(createDownloadAPI(queue))
      .use(createSubscriptionsAPI({ db, queue }))
      .use(createSchedulerAPI({ scheduler: mockScheduler }));
  });

  afterEach(() => {
    queue.shutdown();
  });

  describe('Health Endpoint', () => {
    it('returns health status', async () => {
      const request = new Request('http://localhost/health');
      const response = await app.handle(request);
      const body = await response.json() as { status: string; timestamp: string };

      expect(response.status).toBe(200);
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
    });
  });

  describe('Download API', () => {
    it('adds a download task', async () => {
      const request = new Request('http://localhost/api/download/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://youtube.com/watch?v=test123' }),
      });
      const response = await app.handle(request);
      const body = await response.json() as { success: boolean; data?: { taskId: string } };

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data?.taskId).toBeDefined();
    });

    it('accepts non-empty URL string', async () => {
      const request = new Request('http://localhost/api/download/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'not-a-valid-url' }),
      });
      const response = await app.handle(request);
      const body = await response.json() as { success: boolean };

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('rejects empty URL', async () => {
      const request = new Request('http://localhost/api/download/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: '' }),
      });
      const response = await app.handle(request);

      expect(response.status).toBe(422);
    });

    it('gets all tasks', async () => {
      queue.addTask('https://youtube.com/watch?v=abc123');
      
      const request = new Request('http://localhost/api/download/queue');
      const response = await app.handle(request);
      const body = await response.json() as { success: boolean; data?: unknown[] };

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data?.length).toBe(1);
    });

    it('removes a task', async () => {
      const id = queue.addTask('https://youtube.com/watch?v=abc456');
      
      const request = new Request(`http://localhost/api/download/task/${id}`, {
        method: 'DELETE',
      });
      const response = await app.handle(request);
      const body = await response.json() as { success: boolean };

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(queue.getTask(id)).toBeUndefined();
    });

    it('clears completed tasks', async () => {
      queue.addTask('https://youtube.com/watch?v=abc789');
      
      const request = new Request('http://localhost/api/download/clear-completed', {
        method: 'POST',
      });
      const response = await app.handle(request);
      const body = await response.json() as { success: boolean };

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('gets queue info', async () => {
      queue.addTask('https://youtube.com/watch?v=abc000');
      
      const request = new Request('http://localhost/api/download/queue-info');
      const response = await app.handle(request);
      const body = await response.json() as { success: boolean; data?: { total: number } };

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data?.total).toBe(1);
    });

    it('adds bulk tasks', async () => {
      const request = new Request('http://localhost/api/download/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          urls: [
            'https://youtube.com/watch?v=bulk1',
            'https://youtube.com/watch?v=bulk2',
          ] 
        }),
      });
      const response = await app.handle(request);
      const body = await response.json() as { success: boolean; data?: { count: number } };

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data?.count).toBe(2);
    });
  });

  describe('Subscriptions API', () => {
    it('lists subscriptions', async () => {
      const request = new Request('http://localhost/api/subscriptions');
      const response = await app.handle(request);
      const body = await response.json() as { success: boolean; data?: unknown[] };

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('adds subscription', async () => {
      const request = new Request('http://localhost/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Playlist',
          url: 'https://www.youtube.com/playlist?list=PLtest123',
        }),
      });
      const response = await app.handle(request);
      const body = await response.json() as { success: boolean; data?: { id: number } };

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data?.id).toBeDefined();
    });

    it('accepts any non-empty URL string', async () => {
      const request = new Request('http://localhost/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test',
          url: 'invalid-url',
        }),
      });
      const response = await app.handle(request);
      const body = await response.json() as { success: boolean };

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('rejects empty subscription name', async () => {
      const request = new Request('http://localhost/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '',
          url: 'https://www.youtube.com/playlist?list=PLtest456',
        }),
      });
      const response = await app.handle(request);

      expect(response.status).toBe(422);
    });

    it('deletes subscription', async () => {
      const addRequest = new Request('http://localhost/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'To Delete',
          url: 'https://www.youtube.com/playlist?list=PLdelete',
        }),
      });
      const addResponse = await app.handle(addRequest);
      const addBody = await addResponse.json() as { success: boolean; data?: { id: number } };
      const id = addBody.data?.id;

      const deleteRequest = new Request(`http://localhost/api/subscriptions/${id}`, {
        method: 'DELETE',
      });
      const deleteResponse = await app.handle(deleteRequest);
      const deleteBody = await deleteResponse.json() as { success: boolean };

      expect(deleteResponse.status).toBe(200);
      expect(deleteBody.success).toBe(true);
    });
  });

  describe('Scheduler API', () => {
    it('gets scheduler status', async () => {
      const request = new Request('http://localhost/api/scheduler/status');
      const response = await app.handle(request);
      const body = await response.json() as { success: boolean; data?: { enabled: boolean } };

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data?.enabled).toBe(false);
    });

    it('triggers manual sync', async () => {
      const request = new Request('http://localhost/api/scheduler/sync-now', {
        method: 'POST',
      });
      const response = await app.handle(request);
      const body = await response.json() as { success: boolean };

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });
  });

  describe('404 handling', () => {
    it('returns 404 for unknown routes', async () => {
      const request = new Request('http://localhost/api/unknown-endpoint');
      const response = await app.handle(request);

      expect(response.status).toBe(404);
    });
  });
});
