import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../setup';
import { PlaylistSync } from '../../src/components/PlaylistSync';
import type { PlaylistSyncResult } from '@yt-auto-downloader/shared';

describe('PlaylistSync', () => {
  it('renders input field and button', () => {
    render(<PlaylistSync onSync={vi.fn()} />);

    expect(screen.getByText('🔄 同步播放列表')).toBeDefined();
    expect(screen.getByPlaceholderText('粘贴 YouTube 播放列表链接...')).toBeDefined();
    expect(screen.getByText('开始同步')).toBeDefined();
  });

  it('button is disabled when input is empty', () => {
    render(<PlaylistSync onSync={vi.fn()} />);

    const button = screen.getByText('开始同步') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('button is enabled when input has value', () => {
    render(<PlaylistSync onSync={vi.fn()} />);

    const textarea = screen.getByPlaceholderText('粘贴 YouTube 播放列表链接...');
    fireEvent.change(textarea, { target: { value: 'https://youtube.com/playlist?list=xxx' } });

    const button = screen.getByText('开始同步') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it('shows syncing state while syncing', async () => {
    const onSync = vi.fn().mockImplementation(
      () => new Promise<PlaylistSyncResult>((resolve) => setTimeout(() => resolve({ added: 5, total: 10, downloaded: 2 }), 100)),
    );

    render(<PlaylistSync onSync={onSync} />);

    const textarea = screen.getByPlaceholderText('粘贴 YouTube 播放列表链接...');
    fireEvent.change(textarea, { target: { value: 'https://youtube.com/playlist?list=xxx' } });

    const button = screen.getByText('开始同步');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('🔄 同步中...')).toBeDefined();
    });
  });

  it('displays result after successful sync', async () => {
    const onSync = vi.fn().mockResolvedValue({ added: 5, total: 10, downloaded: 2 });

    render(<PlaylistSync onSync={onSync} />);

    const textarea = screen.getByPlaceholderText('粘贴 YouTube 播放列表链接...');
    fireEvent.change(textarea, { target: { value: 'https://youtube.com/playlist?list=xxx' } });

    const button = screen.getByText('开始同步');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('✅ 同步完成')).toBeDefined();
      expect(screen.getByText('新添加: 5 个任务')).toBeDefined();
      expect(screen.getByText('总视频: 10 个')).toBeDefined();
      expect(screen.getByText('已下载: 2 个')).toBeDefined();
    });
  });

  it('displays result with zero values', async () => {
    const onSync = vi.fn().mockResolvedValue({ added: 0, total: 0, downloaded: 0 });

    render(<PlaylistSync onSync={onSync} />);

    const textarea = screen.getByPlaceholderText('粘贴 YouTube 播放列表链接...');
    fireEvent.change(textarea, { target: { value: 'https://youtube.com/playlist?list=xxx' } });

    const button = screen.getByText('开始同步');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('新添加: 0 个任务')).toBeDefined();
    });
  });

  it('trims whitespace from input', async () => {
    const onSync = vi.fn().mockResolvedValue({ added: 1, total: 1, downloaded: 0 });

    render(<PlaylistSync onSync={onSync} />);

    const textarea = screen.getByPlaceholderText('粘贴 YouTube 播放列表链接...');
    fireEvent.change(textarea, { target: { value: '  https://youtube.com/playlist?list=xxx  ' } });

    const button = screen.getByText('开始同步');
    fireEvent.click(button);

    await waitFor(() => {
      expect(onSync).toHaveBeenCalledWith('https://youtube.com/playlist?list=xxx');
    });
  });
});
