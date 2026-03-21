import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '../setup';
import { PlaylistsPage } from '../../src/pages/Playlists';
import '@testing-library/jest-dom';

const mockSubscriptions = [
  {
    id: '1',
    url: 'https://youtube.com/playlist?list=PL123',
    name: 'Test Playlist 1',
    enabled: true,
    limitPerSync: 10,
    lastSyncedAt: Date.now() - 3600000,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 3600000,
  },
  {
    id: '2',
    url: 'https://youtube.com/playlist?list=PL456',
    name: 'Test Playlist 2',
    enabled: false,
    limitPerSync: 5,
    lastSyncedAt: null,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
  },
];

const mockSchedulerStatus = {
  enabled: true,
  cronExpression: '0 6 * * *',
  timezone: 'UTC',
  nextRunAt: Date.now() + 3600000 * 6,
  isRunning: true,
};

describe('PlaylistsPage', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    fetchMock = vi.fn().mockImplementation((url: unknown) => {
      const urlStr = url as string;
      if (urlStr === '/api/subscriptions') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockSubscriptions }),
        });
      }
      if (urlStr === '/api/scheduler/status') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockSchedulerStatus }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title', async () => {
    render(<PlaylistsPage />);
    await waitFor(() => {
      expect(screen.getByText('My Playlists')).toBeInTheDocument();
    });
  });

  it('renders URL input field', async () => {
    render(<PlaylistsPage />);
    await waitFor(() => {
      expect(screen.getByLabelText('Playlist URL')).toBeInTheDocument();
    });
  });

  it('renders name input field', async () => {
    render(<PlaylistsPage />);
    await waitFor(() => {
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
    });
  });

  it('renders limit per sync input', async () => {
    render(<PlaylistsPage />);
    await waitFor(() => {
      expect(screen.getByLabelText('Limit per sync')).toBeInTheDocument();
    });
  });

  it('renders add button', async () => {
    render(<PlaylistsPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
    });
  });

  it('renders subscription count card', async () => {
    render(<PlaylistsPage />);
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  it('renders next sync card', async () => {
    render(<PlaylistsPage />);
    await waitFor(() => {
      expect(screen.getByText('Next sync')).toBeInTheDocument();
    });
  });

  it('renders sync all button', async () => {
    render(<PlaylistsPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument();
    });
  });

  it('renders subscription table when data exists', async () => {
    render(<PlaylistsPage />);
    await waitFor(() => {
      expect(screen.getByText('Test Playlist 1')).toBeInTheDocument();
    });
  });

  it('displays empty state when no subscriptions', async () => {
    fetchMock.mockImplementation((url: unknown) => {
      const urlStr = url as string;
      if (urlStr === '/api/subscriptions') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: [] }),
        });
      }
      if (urlStr === '/api/scheduler/status') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockSchedulerStatus }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<PlaylistsPage />);
    await waitFor(() => {
      expect(screen.getByText(/no playlists subscribed/i)).toBeInTheDocument();
    });
  });

  it('shows disabled scheduler warning when scheduler is disabled', async () => {
    fetchMock.mockImplementation((url: unknown) => {
      const urlStr = url as string;
      if (urlStr === '/api/subscriptions') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: [] }),
        });
      }
      if (urlStr === '/api/scheduler/status') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { ...mockSchedulerStatus, enabled: false } }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<PlaylistsPage />);
    await waitFor(() => {
      expect(screen.getByText(/scheduler is disabled/i)).toBeInTheDocument();
    });
  });
});
