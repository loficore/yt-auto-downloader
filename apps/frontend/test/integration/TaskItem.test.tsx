import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '../setup';
import { TaskItem } from '../../src/components/TaskItem';
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

describe('TaskItem', () => {
  it('renders task title and artist', () => {
    const task = createMockTask({ title: 'Test Video', artist: 'Test Artist' });
    const onRemove = vi.fn();

    render(<TaskItem task={task} onRemove={onRemove} />);

    expect(screen.getByText('Test Video')).toBeDefined();
    expect(screen.getByText('Test Artist')).toBeDefined();
  });

  it('displays pending status correctly', () => {
    const task = createMockTask({ status: 'pending' });

    render(<TaskItem task={task} onRemove={vi.fn()} />);

    expect(screen.getByText(/等待中/)).toBeDefined();
  });

  it('displays downloading status with progress', () => {
    const task = createMockTask({ status: 'downloading', progress: 50 });

    render(<TaskItem task={task} onRemove={vi.fn()} />);

    expect(screen.getByText(/下载中/)).toBeDefined();
    expect(screen.getByText('50%')).toBeDefined();
  });

  it('displays completed status correctly', () => {
    const task = createMockTask({ status: 'completed' });

    render(<TaskItem task={task} onRemove={vi.fn()} />);

    expect(screen.getByText(/已完成/)).toBeDefined();
  });

  it('displays failed status with error message', () => {
    const task = createMockTask({ status: 'failed', error: 'Download failed' });

    render(<TaskItem task={task} onRemove={vi.fn()} />);

    expect(screen.getByText(/失败/)).toBeDefined();
    expect(screen.getByText('Download failed')).toBeDefined();
  });

  it('calls onRemove when delete button is clicked', () => {
    const task = createMockTask({ id: 'task-to-remove' });
    const onRemove = vi.fn();

    render(<TaskItem task={task} onRemove={onRemove} />);

    const deleteButton = screen.getByRole('button', { name: /删除任务/i });
    fireEvent.click(deleteButton);

    expect(onRemove).toHaveBeenCalledWith('task-to-remove');
  });

  it('does not show progress bar for non-downloading tasks', () => {
    const task = createMockTask({ status: 'pending' });

    render(<TaskItem task={task} onRemove={vi.fn()} />);

    expect(screen.queryByText('%')).toBeNull();
  });

  it('shows progress bar for downloading tasks', () => {
    const task = createMockTask({ status: 'downloading', progress: 75 });

    render(<TaskItem task={task} onRemove={vi.fn()} />);

    expect(screen.getByText('75%')).toBeDefined();
  });

  it('shows retry button for failed tasks when onRetry is provided', () => {
    const task = createMockTask({ status: 'failed', error: 'Download failed' });
    const onRetry = vi.fn();

    render(<TaskItem task={task} onRemove={vi.fn()} onRetry={onRetry} />);

    expect(screen.getByRole('button', { name: /重试任务/i })).toBeDefined();
  });

  it('calls onRetry when retry button is clicked', () => {
    const task = createMockTask({ id: 'task-to-retry', status: 'failed' });
    const onRetry = vi.fn();

    render(<TaskItem task={task} onRemove={vi.fn()} onRetry={onRetry} />);

    const retryButton = screen.getByRole('button', { name: /重试任务/i });
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalledWith('task-to-retry');
  });
});
