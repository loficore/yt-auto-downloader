import { describe, expect, it, beforeEach, vi } from 'vitest';
import { Elysia } from 'elysia';
import { createSubscriptionsAPI } from '../../src/api/subscriptions';

interface MockSubscription {
  id: string;
  url: string;
  name: string;
  enabled: boolean;
  limit_per_sync: number | null;
  last_synced_at: number | null;
  created_at: number;
  updated_at: number;
}

class MockDatabase {
  private subscriptions: MockSubscription[] = [];
  private seq = 0;

  getSubscriptions(): MockSubscription[] {
    return [...this.subscriptions];
  }

  getEnabledSubscriptions(): MockSubscription[] {
    return this.subscriptions.filter((s) => s.enabled);
  }

  addSubscription(url: string, name: string, limitPerSync: number | null = 10): MockSubscription {
    const now = Date.now();
    const id = `sub-${++this.seq}`;
    const sub: MockSubscription = {
      id,
      url,
      name,
      enabled: true,
      limit_per_sync: limitPerSync,
      last_synced_at: null,
      created_at: now,
      updated_at: now,
    };
    this.subscriptions.push(sub);
    return sub;
  }

  updateSubscription(
    id: string,
    updates: Partial<Pick<MockSubscription, 'name' | 'enabled' | 'limit_per_sync' | 'last_synced_at'>>,
  ): boolean {
    const index = this.subscriptions.findIndex((s) => s.id === id);
    if (index === -1) return false;

    if (updates.name !== undefined) this.subscriptions[index].name = updates.name;
    if (updates.enabled !== undefined) this.subscriptions[index].enabled = updates.enabled;
    if (updates.limit_per_sync !== undefined) this.subscriptions[index].limit_per_sync = updates.limit_per_sync;
    if (updates.last_synced_at !== undefined)
      this.subscriptions[index].last_synced_at = updates.last_synced_at;

    this.subscriptions[index].updated_at = Date.now();
    return true;
  }

  deleteSubscription(id: string): boolean {
    const index = this.subscriptions.findIndex((s) => s.id === id);
    if (index === -1) return false;
    this.subscriptions.splice(index, 1);
    return true;
  }
}

class MockQueue {
  async syncPlaylist(url: string) {
    return { added: 5, total: 10, downloaded: 0 };
  }
}

async function requestJson(app: AppLike, req: Request): Promise<unknown> {
  const response = await app.handle(req);
  return response.json();
}

interface AppLike {
  handle(request: Request): Response | Promise<Response>;
}

describe('subscriptions api', () => {
  let db: MockDatabase;
  let queue: MockQueue;
  let app: AppLike;

  beforeEach(() => {
    db = new MockDatabase();
    queue = new MockQueue();
    app = new Elysia().use(createSubscriptionsAPI({ db: db as never, queue: queue as never }));
  });

  it('GET /api/subscriptions returns empty array initially', async () => {
    const json = (await requestJson(
      app,
      new Request('http://localhost/api/subscriptions'),
    )) as { success: boolean; data: unknown[] };

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(0);
  });

  it('POST /api/subscriptions creates a new subscription', async () => {
    const json = (await requestJson(
      app,
      new Request('http://localhost/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://www.youtube.com/playlist?list=PLxxx',
          name: 'My Playlist',
          limitPerSync: 50,
        }),
      }),
    )) as { success: boolean; data: { id: string; url: string; name: string; limitPerSync: number | null } };

    expect(json.success).toBe(true);
    expect(json.data.url).toBe('https://www.youtube.com/playlist?list=PLxxx');
    expect(json.data.name).toBe('My Playlist');
    expect(json.data.limitPerSync).toBe(50);
  });

  it('POST /api/subscriptions rejects duplicate URL', async () => {
    await db.addSubscription('https://youtube.com/playlist?list=xxx', 'Test');

    const json = (await requestJson(
      app,
      new Request('http://localhost/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://youtube.com/playlist?list=xxx',
          name: 'Duplicate',
        }),
      }),
    )) as { success: boolean; error?: string };

    expect(json.success).toBe(false);
    expect(json.error).toBe('Subscription with this URL already exists');
  });

  it('GET /api/subscriptions returns created subscription', async () => {
    await db.addSubscription('https://youtube.com/playlist?list=abc', 'Test Playlist');

    const json = (await requestJson(
      app,
      new Request('http://localhost/api/subscriptions'),
    )) as { success: boolean; data: Array<{ id: string; url: string; name: string }> };

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0]?.url).toBe('https://youtube.com/playlist?list=abc');
  });

  it('PUT /api/subscriptions/:id updates subscription', async () => {
    const sub = await db.addSubscription('https://youtube.com/playlist?list=xyz', 'Original');

    const json = (await requestJson(
      app,
      new Request(`http://localhost/api/subscriptions/${sub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated', enabled: false }),
      }),
    )) as { success: boolean; data: { name: string; enabled: boolean } };

    expect(json.success).toBe(true);
    expect(json.data.name).toBe('Updated');
    expect(json.data.enabled).toBe(false);
  });

  it('PUT /api/subscriptions/:id returns error for non-existent id', async () => {
    const json = (await requestJson(
      app,
      new Request('http://localhost/api/subscriptions/non-existent-id', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      }),
    )) as { success: boolean; error?: string };

    expect(json.success).toBe(false);
    expect(json.error).toBe('Subscription not found');
  });

  it('DELETE /api/subscriptions/:id removes subscription', async () => {
    const sub = await db.addSubscription('https://youtube.com/playlist?list=del', 'To Delete');

    const json = (await requestJson(
      app,
      new Request(`http://localhost/api/subscriptions/${sub.id}`, {
        method: 'DELETE',
      }),
    )) as { success: boolean; data: { deleted: boolean } };

    expect(json.success).toBe(true);
    expect(json.data.deleted).toBe(true);
    expect(db.getSubscriptions()).toHaveLength(0);
  });

  it('DELETE /api/subscriptions/:id returns false for non-existent id', async () => {
    const json = (await requestJson(
      app,
      new Request('http://localhost/api/subscriptions/non-existent', {
        method: 'DELETE',
      }),
    )) as { success: boolean; data: { deleted: boolean } };

    expect(json.success).toBe(false);
    expect(json.data.deleted).toBe(false);
  });

  it('POST /api/subscriptions/:id/sync triggers sync for subscription', async () => {
    const sub = await db.addSubscription('https://youtube.com/playlist?list=sync', 'Sync Test');

    const json = (await requestJson(
      app,
      new Request(`http://localhost/api/subscriptions/${sub.id}/sync`, {
        method: 'POST',
      }),
    )) as { success: boolean; data: { added: number } };

    expect(json.success).toBe(true);
    expect(json.data.added).toBe(5);
  });

  it('POST /api/subscriptions/:id/sync returns error for non-existent id', async () => {
    const json = (await requestJson(
      app,
      new Request('http://localhost/api/subscriptions/non-existent/sync', {
        method: 'POST',
      }),
    )) as { success: boolean; error?: string };

    expect(json.success).toBe(false);
    expect(json.error).toBe('Subscription not found');
  });

  it('POST /api/subscriptions/sync-all triggers sync for all enabled subscriptions', async () => {
    await db.addSubscription('https://youtube.com/playlist?list=1', 'Sub 1');
    await db.addSubscription('https://youtube.com/playlist?list=2', 'Sub 2');

    const json = (await requestJson(
      app,
      new Request('http://localhost/api/subscriptions/sync-all', {
        method: 'POST',
      }),
    )) as { success: boolean; data: Array<{ id: string; name: string }> };

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(2);
  });

  describe('Edge cases', () => {
    it('rejects empty URL in POST', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: '', name: 'Test' }),
        })
      );
      expect(response.status).toBe(422);
    });

    it('rejects empty name in POST', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'https://youtube.com/playlist?list=PLtest', name: '' }),
        })
      );
      expect(response.status).toBe(422);
    });

    it('rejects duplicate URL in POST', async () => {
      await db.addSubscription('https://youtube.com/playlist?list=PLdup', 'First');
      
      const json = (await requestJson(
        app,
        new Request('http://localhost/api/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'https://youtube.com/playlist?list=PLdup', name: 'Second' }),
        })
      )) as { success: boolean; error?: string };

      expect(json.success).toBe(false);
      expect(json.error).toContain('already exists');
    });

    it('handles update with no valid fields', async () => {
      const sub = await db.addSubscription('https://youtube.com/playlist?list=PLupdate', 'Update Test');
      
      const json = (await requestJson(
        app,
        new Request(`http://localhost/api/subscriptions/${sub.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
      )) as { success: boolean };

      expect(json.success).toBe(true);
    });

    it('handles invalid limitPerSync in POST', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'https://youtube.com/playlist?list=PLtest', name: 'Test', limitPerSync: -1 }),
        })
      );
      expect(response.status).toBe(422);
    });

    it('returns 404 for unknown route', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/subscriptions/unknown')
      );
      expect(response.status).toBe(404);
    });


  });
});
