import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '../setup';
import { DownloadList } from '../../src/components/DownloadList';
import type { DownloadTask } from '@yt-auto-downloader/shared';

const createMockTask = (overrides: Partial<DownloadTask> = {}): DownloadTask => ({
  id: 'task-1',
  url: 'https://youtube.com/watch?v=abc123',
  status: 'pending',
  progress: 0,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  title: 'Test Video',
  artist: 'Test Artist',
  album: 'Test Album',
  error: undefined,
  ...overrides,
});

describe('DownloadList', () => {
  it('renders title', () => {
    render(
      <DownloadList tasks={[]} onRemove={vi.fn()} onClearCompleted={vi.fn()} />,
    );

    expect(screen.getByText('下载列表')).toBeDefined();
  });

  it('shows empty state when no tasks', () => {
    render(
      <DownloadList tasks={[]} onRemove={vi.fn()} onClearCompleted={vi.fn()} />,
    );

    expect(screen.getByText('暂无任务')).toBeDefined();
    expect(screen.getByText('添加 URL 后将在这里显示下载进度')).toBeDefined();
  });

  it('renders task list when tasks exist', () => {
    const tasks = [createMockTask({ id: 'task-1' }), createMockTask({ id: 'task-2' })];

    render(
      <DownloadList tasks={tasks} onRemove={vi.fn()} onClearCompleted={vi.fn()} />,
    );

    expect(screen.queryByText('暂无任务')).toBeNull();
  });

  it('shows clear completed button when there are completed tasks', () => {
    const tasks = [
      createMockTask({ id: 'task-1', status: 'completed' }),
      createMockTask({ id: 'task-2', status: 'pending' }),
    ];

    render(
      <DownloadList tasks={tasks} onRemove={vi.fn()} onClearCompleted={vi.fn()} />,
    );

    expect(screen.getByText('清理已完成')).toBeDefined();
  });

  it('does not show clear completed button when no completed tasks', () => {
    const tasks = [
      createMockTask({ id: 'task-1', status: 'pending' }),
      createMockTask({ id: 'task-2', status: 'downloading' }),
    ];

    render(
      <DownloadList tasks={tasks} onRemove={vi.fn()} onClearCompleted={vi.fn()} />,
    );

    expect(screen.queryByText('清理已完成')).toBeNull();
  });

  it('calls onClearCompleted when button is clicked', () => {
    const tasks = [createMockTask({ id: 'task-1', status: 'completed' })];
    const onClearCompleted = vi.fn();

    render(
      <DownloadList tasks={tasks} onRemove={vi.fn()} onClearCompleted={onClearCompleted} />,
    );

    const button = screen.getByText('清理已完成');
    button.click();

    expect(onClearCompleted).toHaveBeenCalled();
  });
});
