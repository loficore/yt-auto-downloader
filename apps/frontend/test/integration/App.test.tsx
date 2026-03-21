import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '../setup';
import { App } from '../../src/App';
import '@testing-library/jest-dom';

vi.mock('../../src/hooks/useWebSocket', () => ({
  useWebSocket: () => ({ connected: true }),
}));

vi.mock('../../src/hooks/useDownloadTasks', () => ({
  useDownloadTasks: () => ({
    tasks: [],
    queueInfo: { total: 0, pending: 0, downloading: 0, completed: 0, failed: 0 },
    removeTask: vi.fn(),
    clearCompleted: vi.fn(),
    syncPlaylist: vi.fn(),
    refreshTasks: vi.fn().mockResolvedValue(undefined),
    handleWebSocketMessage: vi.fn(),
  }),
}));

describe('App', () => {
  it('renders app title', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/Yuba/)).toBeInTheDocument();
    });
  });

  it('renders connection status', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('已连接')).toBeInTheDocument();
    });
  });

  it('renders queue stats component', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('总计')).toBeInTheDocument();
    });
  });

  it('renders PlaylistSync component', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('🔄 同步播放列表')).toBeInTheDocument();
    });
  });
});
