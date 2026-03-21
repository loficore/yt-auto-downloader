import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '../setup';
import { AppLayout } from '../../src/layout/AppLayout';
import '@testing-library/jest-dom';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  Outlet: () => <div data-testid="outlet">Content</div>,
}));

describe('AppLayout', () => {
  it('renders app title', async () => {
    render(<AppLayout />);
    await waitFor(() => {
      expect(screen.getByText('Yuba')).toBeInTheDocument();
    });
  });

  it('renders Downloads link', async () => {
    render(<AppLayout />);
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Downloads' })).toBeInTheDocument();
    });
  });

  it('renders Playlists link', async () => {
    render(<AppLayout />);
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Playlists' })).toBeInTheDocument();
    });
  });

  it('renders footer text', async () => {
    render(<AppLayout />);
    await waitFor(() => {
      expect(screen.getByText('Built for music workflow automation')).toBeInTheDocument();
    });
  });

  it('renders outlet', async () => {
    render(<AppLayout />);
    await waitFor(() => {
      expect(screen.getByTestId('outlet')).toBeInTheDocument();
    });
  });

  it('renders app shell structure', async () => {
    render(<AppLayout />);
    await waitFor(() => {
      const header = document.querySelector('.app-header-shell');
      const footer = document.querySelector('.app-footer-shell');
      expect(header).toBeInTheDocument();
      expect(footer).toBeInTheDocument();
    });
  });
});
