import { describe, expect, it } from 'vitest';
import type { 
  DownloadTask, 
  QueueInfo, 
  WebSocketMessage, 
  ApiResponse,
  PlaylistSyncResult,
  DownloadStatus 
} from '../types/index';

describe('Shared Types', () => {
  describe('DownloadStatus', () => {
    it('accepts valid status values', () => {
      const statuses: DownloadStatus[] = [
        'pending',
        'downloading',
        'completed',
        'failed',
        'paused',
      ];
      
      statuses.forEach(status => {
        expect(status).toBeDefined();
      });
    });
  });

  describe('DownloadTask', () => {
    it('creates valid task object', () => {
      const task: DownloadTask = {
        id: 'task-1',
        title: 'Test Video',
        url: 'https://youtube.com/watch?v=abc123',
        status: 'pending',
        progress: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(task.id).toBe('task-1');
      expect(task.status).toBe('pending');
      expect(task.progress).toBe(0);
    });

    it('allows optional fields', () => {
      const task: DownloadTask = {
        id: 'task-1',
        title: 'Test Video',
        url: 'https://youtube.com/watch?v=abc123',
        status: 'pending',
        progress: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        artist: 'Test Artist',
        album: 'Test Album',
        error: 'Some error',
      };

      expect(task.artist).toBe('Test Artist');
      expect(task.album).toBe('Test Album');
      expect(task.error).toBe('Some error');
    });

    it('accepts all valid statuses', () => {
      const statuses: DownloadStatus[] = ['pending', 'downloading', 'completed', 'failed', 'paused'];
      
      statuses.forEach(status => {
        const task: DownloadTask = {
          id: 'task-1',
          title: 'Test',
          url: 'https://youtube.com/watch?v=abc',
          status,
          progress: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        expect(task.status).toBe(status);
      });
    });
  });

  describe('QueueInfo', () => {
    it('creates valid queue info', () => {
      const info: QueueInfo = {
        total: 10,
        pending: 5,
        downloading: 2,
        completed: 2,
        failed: 1,
      };

      expect(info.total).toBe(10);
      expect(info.pending + info.downloading + info.completed + info.failed).toBe(info.total);
    });

    it('allows zero values', () => {
      const info: QueueInfo = {
        total: 0,
        pending: 0,
        downloading: 0,
        completed: 0,
        failed: 0,
      };

      expect(info.total).toBe(0);
    });
  });

  describe('WebSocketMessage', () => {
    it('creates task-added message', () => {
      const message: WebSocketMessage = {
        type: 'task-added',
        data: {
          id: 'task-1',
          title: 'Test',
          url: 'https://youtube.com/watch?v=abc',
          status: 'pending',
          progress: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      };

      expect(message.type).toBe('task-added');
      expect(message.data.id).toBe('task-1');
    });

    it('creates task-progress message', () => {
      const message: WebSocketMessage = {
        type: 'task-progress',
        data: {
          id: 'task-1',
          progress: 50,
        },
      };

      expect(message.type).toBe('task-progress');
      expect(message.data.progress).toBe(50);
    });

    it('creates task-completed message', () => {
      const message: WebSocketMessage = {
        type: 'task-completed',
        data: {
          id: 'task-1',
        },
      };

      expect(message.type).toBe('task-completed');
    });

    it('creates task-failed message', () => {
      const message: WebSocketMessage = {
        type: 'task-failed',
        data: {
          id: 'task-1',
          error: 'Download failed',
        },
      };

      expect(message.type).toBe('task-failed');
      expect(message.data.error).toBe('Download failed');
    });

    it('creates queue-info message', () => {
      const message: WebSocketMessage = {
        type: 'queue-info',
        data: {
          total: 5,
          pending: 3,
          downloading: 1,
          completed: 1,
          failed: 0,
        },
      };

      expect(message.type).toBe('queue-info');
      expect(message.data.total).toBe(5);
    });

    it('creates task-log message', () => {
      const message: WebSocketMessage = {
        type: 'task-log',
        data: {
          id: 'task-1',
          log: 'Download started',
        },
      };

      expect(message.type).toBe('task-log');
      expect(message.data.log).toBe('Download started');
    });
  });

  describe('ApiResponse', () => {
    it('creates success response with data', () => {
      const response: ApiResponse<string> = {
        success: true,
        data: 'some data',
      };

      expect(response.success).toBe(true);
      expect(response.data).toBe('some data');
    });

    it('creates error response', () => {
      const response: ApiResponse<string> = {
        success: false,
        error: 'Something went wrong',
      };

      expect(response.success).toBe(false);
      expect(response.error).toBe('Something went wrong');
    });

    it('allows undefined data on success', () => {
      const response: ApiResponse<void> = {
        success: true,
      };

      expect(response.success).toBe(true);
      expect(response.data).toBeUndefined();
    });
  });

  describe('PlaylistSyncResult', () => {
    it('creates valid sync result', () => {
      const result: PlaylistSyncResult = {
        added: 5,
        total: 100,
        downloaded: 95,
      };

      expect(result.added).toBe(5);
      expect(result.total).toBe(100);
      expect(result.downloaded).toBe(95);
    });

    it('allows zero values', () => {
      const result: PlaylistSyncResult = {
        added: 0,
        total: 0,
        downloaded: 0,
      };

      expect(result.added).toBe(0);
    });

    it('validates that downloaded <= total', () => {
      const result: PlaylistSyncResult = {
        added: 10,
        total: 50,
        downloaded: 40,
      };

      expect(result.downloaded).toBeLessThanOrEqual(result.total);
    });
  });
});
