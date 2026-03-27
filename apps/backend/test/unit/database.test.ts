import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { DatabaseService } from '../../src/services/Database';
import { resolve, dirname } from 'path';
import { unlinkSync, existsSync } from 'fs';

const TEST_DB_PATH = resolve(__dirname, '../../data/test-db.db');

describe('DatabaseService', () => {
  let db: DatabaseService;

  beforeEach(() => {
    db = new DatabaseService(TEST_DB_PATH);
  });

  afterEach(() => {
    db.close();
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
  });

  describe('Subscriptions CRUD', () => {
    it('addSubscription creates a new subscription', () => {
      const sub = db.addSubscription(
        'https://youtube.com/playlist?list=test123',
        'Test Playlist',
        50,
      );

      expect(sub.id).toBeDefined();
      expect(sub.url).toBe('https://youtube.com/playlist?list=test123');
      expect(sub.name).toBe('Test Playlist');
      expect(sub.enabled).toBe(true);
      expect(sub.limit_per_sync).toBe(50);
      expect(sub.last_synced_at).toBeNull();
      expect(sub.created_at).toBeDefined();
      expect(sub.updated_at).toBeDefined();
    });

    it('getSubscriptions returns all subscriptions', () => {
      db.addSubscription('https://youtube.com/playlist?list=1', 'Playlist 1');
      db.addSubscription('https://youtube.com/playlist?list=2', 'Playlist 2');

      const subscriptions = db.getSubscriptions();

      expect(subscriptions).toHaveLength(2);
    });

    it('getEnabledSubscriptions returns only enabled subscriptions', () => {
      const sub1 = db.addSubscription('https://youtube.com/playlist?list=1', 'Playlist 1');
      db.addSubscription('https://youtube.com/playlist?list=2', 'Playlist 2');

      db.updateSubscription(sub1.id, { enabled: false });

      const enabled = db.getEnabledSubscriptions();

      expect(enabled).toHaveLength(1);
      expect(enabled[0]?.name).toBe('Playlist 2');
    });

    it('updateSubscription updates subscription fields', () => {
      const sub = db.addSubscription('https://youtube.com/playlist?list=orig', 'Original');

      const updated = db.updateSubscription(sub.id, {
        name: 'Updated Name',
        enabled: false,
        limit_per_sync: 200,
      });

      expect(updated).toBe(true);

      const subscriptions = db.getSubscriptions();
      const found = subscriptions.find((s) => s.id === sub.id);

      expect(found?.name).toBe('Updated Name');
      expect(found?.enabled).toBe(false);
      expect(found?.limit_per_sync).toBe(200);
    });

    it('updateSubscription returns false for non-existent id', () => {
      const result = db.updateSubscription('non-existent-id', { name: 'Test' });

      expect(result).toBe(false);
    });

    it('deleteSubscription removes subscription', () => {
      const sub = db.addSubscription('https://youtube.com/playlist?list=del', 'To Delete');

      const deleted = db.deleteSubscription(sub.id);

      expect(deleted).toBe(true);
      expect(db.getSubscriptions()).toHaveLength(0);
    });

    it('deleteSubscription returns false for non-existent id', () => {
      const result = db.deleteSubscription('non-existent-id');

      expect(result).toBe(false);
    });

    it('prevents duplicate URLs', () => {
      db.addSubscription('https://youtube.com/playlist?list=dup', 'First');

      expect(() => {
        db.addSubscription('https://youtube.com/playlist?list=dup', 'Second');
      }).toThrow();
    });
  });

  describe('Settings', () => {
    it('setSetting and getSetting work correctly', () => {
      db.setSetting('test-key', 'test-value');

      const value = db.getSetting('test-key');

      expect(value).toBe('test-value');
    });

    it('getSetting returns null for non-existent key', () => {
      const value = db.getSetting('non-existent');

      expect(value).toBeNull();
    });

    it('setSetting overwrites existing value', () => {
      db.setSetting('key', 'value1');
      db.setSetting('key', 'value2');

      const value = db.getSetting('key');

      expect(value).toBe('value2');
    });
  });
});
