import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '../setup';
import { DownloadsPage } from '../../src/pages/Downloads';
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
    refreshTasks: vi.fn().mockResolvedValue(undefined),
    handleWebSocketMessage: vi.fn(),
  }),
}));

describe('DownloadsPage', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title', async () => {
    render(<DownloadsPage />);
    await waitFor(() => {
      expect(screen.getByText('Downloads')).toBeInTheDocument();
    });
  });

  it('renders connection status badge', async () => {
    render(<DownloadsPage />);
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  it('renders queue stats component', async () => {
    render(<DownloadsPage />);
    await waitFor(() => {
      expect(screen.getByText('总计')).toBeInTheDocument();
    });
  });
});
