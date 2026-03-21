import { describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-router', () => ({
  createRootRoute: vi.fn(() => ({
    component: () => null,
    notFoundComponent: () => null,
    addChildren: vi.fn().mockReturnValue({}),
  })),
  createRoute: vi.fn((config) => config),
  createRouter: vi.fn(() => ({
    routeTree: { children: [] },
  })),
}));

vi.mock('@mantine/core', () => ({
  MantineProvider: ({ children }: { children: React.ReactNode }) => children,
  createTheme: vi.fn(),
}));

vi.mock('@mantine/notifications', () => ({
  Notifications: () => null,
}));

describe('Router', () => {
  it('creates router module', async () => {
    const mod = await import('../../src/router.tsx');
    expect(mod.router).toBeDefined();
  });
});
