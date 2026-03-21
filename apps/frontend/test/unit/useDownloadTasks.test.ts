import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDownloadTasks } from '../../src/hooks/useDownloadTasks';
import type { DownloadTask, QueueInfo, WebSocketMessage } from '@yt-auto-downloader/shared';

vi.mock('../../src/utils/api', () => ({
  requestApi: vi.fn(),
}));

vi.mock('../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const mockTask: DownloadTask = {
  id: '1',
  url: 'https://youtube.com/watch?v=abc',
  status: 'pending',
  progress: 0,
  title: 'Test Video',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const mockQueueInfo: QueueInfo = {
  total: 1,
  pending: 1,
  downloading: 0,
  completed: 0,
  failed: 0,
};

describe('useDownloadTasks', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with empty tasks and queue', async () => {
    const { requestApi } = await import('../../src/utils/api');
    vi.mocked(requestApi).mockResolvedValue([]);

    const { result } = renderHook(() => useDownloadTasks());

    expect(result.current.tasks).toEqual([]);
    expect(result.current.queueInfo).toEqual({
      total: 0,
      pending: 0,
      downloading: 0,
      completed: 0,
      failed: 0,
    });
  });

  it('refreshTasks fetches tasks from API', async () => {
    const { requestApi } = await import('../../src/utils/api');
    vi.mocked(requestApi).mockResolvedValue([mockTask]);

    const { result } = renderHook(() => useDownloadTasks());

    await act(async () => {
      await result.current.refreshTasks();
    });

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0]).toEqual(mockTask);
  });

  it('handleWebSocketMessage adds task on task-added', () => {
    const { result } = renderHook(() => useDownloadTasks());
    const message: WebSocketMessage = { type: 'task-added', data: mockTask };

    act(() => {
      result.current.handleWebSocketMessage(message);
    });

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0]).toEqual(mockTask);
  });

  it('handleWebSocketMessage updates queue-info', () => {
    const { result } = renderHook(() => useDownloadTasks());
    const message: WebSocketMessage = { type: 'queue-info', data: mockQueueInfo };

    act(() => {
      result.current.handleWebSocketMessage(message);
    });

    expect(result.current.queueInfo).toEqual(mockQueueInfo);
  });

  it('handleWebSocketMessage updates task progress', () => {
    const { result } = renderHook(() => useDownloadTasks());
    const addMessage: WebSocketMessage = { type: 'task-added', data: mockTask };
    const progressMessage: WebSocketMessage = {
      type: 'task-progress',
      data: { id: '1', progress: 50 },
    };

    act(() => {
      result.current.handleWebSocketMessage(addMessage);
    });

    act(() => {
      result.current.handleWebSocketMessage(progressMessage);
    });

    expect(result.current.tasks[0].progress).toBe(50);
  });

  it('handleWebSocketMessage marks task as completed', () => {
    const { result } = renderHook(() => useDownloadTasks());
    const addMessage: WebSocketMessage = { type: 'task-added', data: mockTask };
    const completedMessage: WebSocketMessage = {
      type: 'task-completed',
      data: { id: '1' },
    };

    act(() => {
      result.current.handleWebSocketMessage(addMessage);
    });

    act(() => {
      result.current.handleWebSocketMessage(completedMessage);
    });

    expect(result.current.tasks[0].status).toBe('completed');
    expect(result.current.tasks[0].progress).toBe(100);
  });

  it('handleWebSocketMessage marks task as failed', () => {
    const { result } = renderHook(() => useDownloadTasks());
    const addMessage: WebSocketMessage = { type: 'task-added', data: mockTask };
    const failedMessage: WebSocketMessage = {
      type: 'task-failed',
      data: { id: '1', error: 'Download failed' },
    };

    act(() => {
      result.current.handleWebSocketMessage(addMessage);
    });

    act(() => {
      result.current.handleWebSocketMessage(failedMessage);
    });

    expect(result.current.tasks[0].status).toBe('failed');
    expect(result.current.tasks[0].error).toBe('Download failed');
  });

  it('removeTask removes task from list', async () => {
    const { requestApi } = await import('../../src/utils/api');
    vi.mocked(requestApi).mockResolvedValueOnce([mockTask]).mockResolvedValueOnce({ removed: true });

    const { result } = renderHook(() => useDownloadTasks());

    await act(async () => {
      await result.current.refreshTasks();
    });

    await act(async () => {
      await result.current.removeTask('1');
    });

    expect(result.current.tasks).toHaveLength(0);
  });

  it('clearCompleted removes completed tasks', async () => {
    const { requestApi } = await import('../../src/utils/api');
    const completedTask = { ...mockTask, status: 'completed' as const };
    vi.mocked(requestApi).mockResolvedValueOnce([completedTask]).mockResolvedValueOnce(mockQueueInfo);

    const { result } = renderHook(() => useDownloadTasks());

    await act(async () => {
      await result.current.refreshTasks();
    });

    await act(async () => {
      await result.current.clearCompleted();
    });

    expect(result.current.tasks).toHaveLength(0);
  });
});
