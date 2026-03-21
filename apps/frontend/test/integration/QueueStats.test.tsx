import { describe, expect, it } from 'vitest';
import { render, screen } from '../setup';
import { QueueStats } from '../../src/components/QueueStats';
import type { QueueInfo } from '@yt-auto-downloader/shared';

const createMockStats = (overrides: Partial<QueueInfo> = {}): QueueInfo => ({
  total: 0,
  pending: 0,
  downloading: 0,
  completed: 0,
  failed: 0,
  ...overrides,
});

describe('QueueStats', () => {
  it('renders all stat items', () => {
    const stats = createMockStats({
      total: 10,
      pending: 5,
      downloading: 2,
      completed: 2,
      failed: 1,
    });

    render(<QueueStats stats={stats} />);

    expect(screen.getByText('队列统计')).toBeDefined();
    expect(screen.getByText('总计')).toBeDefined();
    expect(screen.getByText('等待中')).toBeDefined();
    expect(screen.getByText('下载中')).toBeDefined();
    expect(screen.getByText('已完成')).toBeDefined();
    expect(screen.getByText('失败')).toBeDefined();
  });

  it('displays correct values', () => {
    const stats = createMockStats({
      total: 100,
      pending: 50,
      downloading: 25,
      completed: 20,
      failed: 5,
    });

    render(<QueueStats stats={stats} />);

    expect(screen.getByText('100')).toBeDefined();
    expect(screen.getByText('50')).toBeDefined();
    expect(screen.getByText('25')).toBeDefined();
    expect(screen.getByText('20')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();
  });

  it('renders with zero values', () => {
    const stats = createMockStats();

    render(<QueueStats stats={stats} />);

    expect(screen.getAllByText('0')).toHaveLength(5);
  });
});
