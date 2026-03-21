import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EventEmitter, type WSConnection } from '../../src/services/EventEmitter';

const createMockConnection = (): WSConnection => ({
  send: vi.fn(),
  readyState: 1,
});

describe('EventEmitter', () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  describe('addConnection', () => {
    it('adds a connection to the set', () => {
      const conn = createMockConnection();
      emitter.addConnection(conn);
      expect(emitter.getConnectionCount()).toBe(1);
    });

    it('allows multiple connections', () => {
      const conn1 = createMockConnection();
      const conn2 = createMockConnection();
      emitter.addConnection(conn1);
      emitter.addConnection(conn2);
      expect(emitter.getConnectionCount()).toBe(2);
    });

    it('Set does not allow duplicate connections', () => {
      const conn = createMockConnection();
      emitter.addConnection(conn);
      emitter.addConnection(conn);
      expect(emitter.getConnectionCount()).toBe(1);
    });
  });

  describe('removeConnection', () => {
    it('removes a connection from the set', () => {
      const conn = createMockConnection();
      emitter.addConnection(conn);
      emitter.removeConnection(conn);
      expect(emitter.getConnectionCount()).toBe(0);
    });

    it('does nothing when removing non-existent connection', () => {
      const conn = createMockConnection();
      emitter.removeConnection(conn);
      expect(emitter.getConnectionCount()).toBe(0);
    });
  });

  describe('broadcast', () => {
    it('sends message to all open connections', () => {
      const conn1 = createMockConnection();
      const conn2 = createMockConnection();
      emitter.addConnection(conn1);
      emitter.addConnection(conn2);

      emitter.broadcast({ type: 'queue-info', data: { total: 1, pending: 1, downloading: 0, completed: 0, failed: 0 } });

      expect(conn1.send).toHaveBeenCalledTimes(1);
      expect(conn2.send).toHaveBeenCalledTimes(1);
    });

    it('does not send to closed connections', () => {
      const conn1 = { ...createMockConnection(), readyState: 3 };
      const conn2 = createMockConnection();
      emitter.addConnection(conn1);
      emitter.addConnection(conn2);

      emitter.broadcast({ type: 'queue-info', data: { total: 1, pending: 1, downloading: 0, completed: 0, failed: 0 } });

      expect(conn1.send).not.toHaveBeenCalled();
      expect(conn2.send).toHaveBeenCalledTimes(1);
    });

    it('removes connection on send error', () => {
      const conn = createMockConnection();
      const sendSpy = vi.spyOn(conn, 'send').mockImplementation(() => {
        throw new Error('Send failed');
      });
      emitter.addConnection(conn);

      emitter.broadcast({ type: 'queue-info', data: { total: 1, pending: 1, downloading: 0, completed: 0, failed: 0 } });

      expect(emitter.getConnectionCount()).toBe(0);
      sendSpy.mockRestore();
    });

    it('serializes message as JSON', () => {
      const conn = createMockConnection();
      emitter.addConnection(conn);

      const mockTask = {
        id: '123',
        url: 'https://example.com',
        status: 'pending' as const,
        progress: 0,
        title: 'Test Video',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      emitter.broadcast({ type: 'task-added', data: mockTask });

      const sentPayload = (conn.send as ReturnType<typeof vi.fn>).mock.calls[0]![0];
      expect(JSON.parse(sentPayload as string)).toEqual({ type: 'task-added', data: mockTask });
    });
  });

  describe('getConnectionCount', () => {
    it('returns 0 for empty emitter', () => {
      expect(emitter.getConnectionCount()).toBe(0);
    });
  });
});
