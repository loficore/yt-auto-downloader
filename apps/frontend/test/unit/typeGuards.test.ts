import { describe, expect, it } from 'vitest';
import {
  isRecord,
  isDownloadTask,
  isQueueInfo,
  isWebSocketMessage,
  isTaskArray,
  isAddTaskData,
  isBulkImportData,
  isRemoveTaskData,
} from '../../src/utils/typeGuards';

describe('typeGuards', () => {
  describe('isRecord', () => {
    it('returns true for object', () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({ key: 'value' })).toBe(true);
    });

    it('returns false for non-object', () => {
      expect(isRecord(null)).toBe(false);
      expect(isRecord(undefined)).toBe(false);
      expect(isRecord('string')).toBe(false);
      expect(isRecord(123)).toBe(false);
      // Note: arrays are objects in JS, so isRecord([]) returns true
      // This is expected behavior - use Array.isArray() to differentiate
    });
  });

  describe('isDownloadTask', () => {
    it('returns true for valid download task', () => {
      const task = {
        id: 'task-1',
        url: 'https://youtube.com/watch?v=abc',
        status: 'pending',
        progress: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        title: 'Test Video',
      };
      expect(isDownloadTask(task)).toBe(true);
    });

    it('returns false for invalid download task', () => {
      expect(isDownloadTask(null)).toBe(false);
      expect(isDownloadTask({})).toBe(false);
      expect(isDownloadTask({ id: '1' })).toBe(false);
      expect(isDownloadTask({ id: '1', url: 'url', status: 'pending', progress: 0, createdAt: 1, updatedAt: 1 })).toBe(false);
    });
  });

  describe('isQueueInfo', () => {
    it('returns true for valid queue info', () => {
      const queueInfo = {
        total: 10,
        pending: 5,
        downloading: 2,
        completed: 2,
        failed: 1,
      };
      expect(isQueueInfo(queueInfo)).toBe(true);
    });

    it('returns false for invalid queue info', () => {
      expect(isQueueInfo(null)).toBe(false);
      expect(isQueueInfo({})).toBe(false);
      expect(isQueueInfo({ total: 10 })).toBe(false);
      expect(isQueueInfo({ total: '10', pending: 5, downloading: 0, completed: 0, failed: 0 })).toBe(false);
    });
  });

  describe('isWebSocketMessage', () => {
    it('returns true for valid task-added message', () => {
      const message = {
        type: 'task-added',
        data: {
          id: 'task-1',
          url: 'https://youtube.com/watch?v=abc',
          status: 'pending',
          progress: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          title: 'Test',
        },
      };
      expect(isWebSocketMessage(message)).toBe(true);
    });

    it('returns true for valid queue-info message', () => {
      const message = {
        type: 'queue-info',
        data: {
          total: 10,
          pending: 5,
          downloading: 2,
          completed: 2,
          failed: 1,
        },
      };
      expect(isWebSocketMessage(message)).toBe(true);
    });

    it('returns true for valid task-progress message', () => {
      const message = {
        type: 'task-progress',
        data: { id: 'task-1', progress: 50 },
      };
      expect(isWebSocketMessage(message)).toBe(true);
    });

    it('returns true for valid task-completed message', () => {
      const message = {
        type: 'task-completed',
        data: { id: 'task-1' },
      };
      expect(isWebSocketMessage(message)).toBe(true);
    });

    it('returns true for valid task-failed message', () => {
      const message = {
        type: 'task-failed',
        data: { id: 'task-1', error: 'Download failed' },
      };
      expect(isWebSocketMessage(message)).toBe(true);
    });

    it('returns false for invalid message', () => {
      expect(isWebSocketMessage(null)).toBe(false);
      expect(isWebSocketMessage({})).toBe(false);
      expect(isWebSocketMessage({ type: 'invalid' })).toBe(false);
      expect(isWebSocketMessage({ type: 'task-added', data: null })).toBe(false);
    });
  });

  describe('isTaskArray', () => {
    it('returns true for valid task array', () => {
      const tasks = [
        { id: '1', url: 'url1', status: 'pending', progress: 0, createdAt: 1, updatedAt: 1, title: 't1' },
        { id: '2', url: 'url2', status: 'pending', progress: 0, createdAt: 1, updatedAt: 1, title: 't2' },
      ];
      expect(isTaskArray(tasks)).toBe(true);
    });

    it('returns false for invalid task array', () => {
      expect(isTaskArray(null)).toBe(false);
      // Note: empty array passes as valid (every() returns true for empty array)
      expect(isTaskArray([{ id: '1' }])).toBe(false);
    });
  });

  describe('isAddTaskData', () => {
    it('returns true for valid add task data with task', () => {
      const data = {
        taskId: 'task-1',
        task: { id: '1', url: 'url', status: 'pending', progress: 0, createdAt: 1, updatedAt: 1, title: 't' },
      };
      expect(isAddTaskData(data)).toBe(true);
    });

    it('returns true for valid add task data with null task', () => {
      const data = { taskId: 'task-1', task: null };
      expect(isAddTaskData(data)).toBe(true);
    });

    it('returns false for invalid add task data', () => {
      expect(isAddTaskData(null)).toBe(false);
      expect(isAddTaskData({})).toBe(false);
      expect(isAddTaskData({ taskId: '1' })).toBe(false);
    });
  });

  describe('isBulkImportData', () => {
    it('returns true for valid bulk import data', () => {
      const data = { taskIds: ['1', '2', '3'], count: 3 };
      expect(isBulkImportData(data)).toBe(true);
    });

    it('returns false for invalid bulk import data', () => {
      expect(isBulkImportData(null)).toBe(false);
      expect(isBulkImportData({})).toBe(false);
      expect(isBulkImportData({ taskIds: ['1'], count: '1' })).toBe(false);
      expect(isBulkImportData({ taskIds: [1], count: 1 })).toBe(false);
    });
  });

  describe('isRemoveTaskData', () => {
    it('returns true for valid remove task data', () => {
      const data = { removed: true };
      expect(isRemoveTaskData(data)).toBe(true);
    });

    it('returns false for invalid remove task data', () => {
      expect(isRemoveTaskData(null)).toBe(false);
      expect(isRemoveTaskData({})).toBe(false);
      expect(isRemoveTaskData({ removed: 'true' })).toBe(false);
    });
  });
});
