import { describe, expect, it, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import { createDownloadAPI } from '../src/api/download';
import type { DownloadStatus } from '@yt-auto-downloader/shared';

interface AppLike {
  handle(request: Request): Response | Promise<Response>;
}

interface MockTask {
  id: string;
  url: string;
  artist?: string;
  status: DownloadStatus;
  progress: number;
  createdAt: number;
  updatedAt: number;
  error?: string;
}

class MockQueue {
  private tasks = new Map<string, MockTask>();
  private seq = 0;

  addTask(url: string, artist?: string): string {
    const id = `task-${++this.seq}`;
    const now = Date.now();
    this.tasks.set(id, {
      id,
      url,
      artist,
      status: 'pending',
      progress: 0,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  }

  addBulkTasks(urls: string[]): string[] {
    return urls.map((url) => this.addTask(url));
  }

  getTask(id: string): MockTask | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): MockTask[] {
    return Array.from(this.tasks.values());
  }

  getQueueInfo() {
    const items = this.getAllTasks();
    return {
      total: items.length,
      pending: items.filter((item) => item.status === 'pending').length,
      downloading: items.filter((item) => item.status === 'downloading').length,
      completed: items.filter((item) => item.status === 'completed').length,
      failed: items.filter((item) => item.status === 'failed').length,
    };
  }

  removeTask(id: string): boolean {
    return this.tasks.delete(id);
  }

  pauseTask(id: string): void {
    const task = this.tasks.get(id);
    if (!task) return;
    task.status = 'paused';
    task.updatedAt = Date.now();
  }

  resumeTask(id: string): void {
    const task = this.tasks.get(id);
    if (!task) return;
    task.status = 'pending';
    task.updatedAt = Date.now();
  }

  clearCompleted(): void {
    for (const [id, task] of this.tasks.entries()) {
      if (task.status === 'completed') {
        this.tasks.delete(id);
      }
    }
  }

  markCompleted(id: string): void {
    const task = this.tasks.get(id);
    if (!task) return;
    task.status = 'completed';
    task.progress = 100;
    task.updatedAt = Date.now();
  }
}

async function requestJson(app: AppLike, req: Request): Promise<unknown> {
  const response = await app.handle(req);
  return response.json();
}

describe('download api', () => {
  let queue: MockQueue;
  let app: AppLike;

  beforeEach(() => {
    queue = new MockQueue();
    app = new Elysia().use(createDownloadAPI(queue as never));
  });

  it('POST /api/download/add adds a task', async () => {
    const json = (await requestJson(
      app,
      new Request('http://localhost/api/download/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://youtube.com/watch?v=aaa' }),
      })
    )) as { success: boolean; data: { taskId: string } };

    expect(json.success).toBe(true);
    expect(json.data.taskId).toContain('task-');
  });

  it('POST /api/download/bulk returns created count', async () => {
    const json = (await requestJson(
      app,
      new Request('http://localhost/api/download/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: ['https://youtube.com/watch?v=1', 'https://youtube.com/watch?v=2'],
        }),
      })
    )) as { success: boolean; data: { taskIds: string[]; count: number } };

    expect(json.success).toBe(true);
    expect(json.data.count).toBe(2);
    expect(json.data.taskIds).toHaveLength(2);
  });

  it('GET /api/download/queue returns queue list', async () => {
    queue.addTask('https://youtube.com/watch?v=q1');
    const json = (await requestJson(
      app,
      new Request('http://localhost/api/download/queue')
    )) as { success: boolean; data: Array<{ id: string; url: string }> };

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0]?.url).toBe('https://youtube.com/watch?v=q1');
  });

  it('GET /api/download/queue-info returns stats', async () => {
    queue.addTask('https://youtube.com/watch?v=s1');
    queue.addTask('https://youtube.com/watch?v=s2');

    const json = (await requestJson(
      app,
      new Request('http://localhost/api/download/queue-info')
    )) as { success: boolean; data: { total: number; pending: number } };

    expect(json.success).toBe(true);
    expect(json.data.total).toBe(2);
    expect(json.data.pending).toBe(2);
  });

  it('DELETE /api/download/task/:id removes task', async () => {
    const taskId = queue.addTask('https://youtube.com/watch?v=del');
    const json = (await requestJson(
      app,
      new Request(`http://localhost/api/download/task/${taskId}`, {
        method: 'DELETE',
      })
    )) as { success: boolean; data: { removed: boolean } };

    expect(json.success).toBe(true);
    expect(json.data.removed).toBe(true);
    expect(queue.getTask(taskId)).toBeUndefined();
  });

  it('POST /api/download/task/:id/pause and /resume updates task status', async () => {
    const taskId = queue.addTask('https://youtube.com/watch?v=state');

    const paused = (await requestJson(
      app,
      new Request(`http://localhost/api/download/task/${taskId}/pause`, {
        method: 'POST',
      })
    )) as { success: boolean; data: { status: DownloadStatus } };

    expect(paused.success).toBe(true);
    expect(paused.data.status).toBe('paused');

    const resumed = (await requestJson(
      app,
      new Request(`http://localhost/api/download/task/${taskId}/resume`, {
        method: 'POST',
      })
    )) as { success: boolean; data: { status: DownloadStatus } };

    expect(resumed.success).toBe(true);
    expect(resumed.data.status).toBe('pending');
  });

  it('POST /api/download/clear-completed removes completed tasks', async () => {
    const completedId = queue.addTask('https://youtube.com/watch?v=c1');
    queue.addTask('https://youtube.com/watch?v=c2');
    queue.markCompleted(completedId);

    const json = (await requestJson(
      app,
      new Request('http://localhost/api/download/clear-completed', {
        method: 'POST',
      })
    )) as { success: boolean; data: { total: number; completed: number } };

    expect(json.success).toBe(true);
    expect(json.data.total).toBe(1);
    expect(json.data.completed).toBe(0);
  });
});
