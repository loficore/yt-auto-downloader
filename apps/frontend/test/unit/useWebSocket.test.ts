import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { WebSocketMessage } from '@yt-auto-downloader/shared';

vi.mock('../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../../src/utils/typeGuards', () => ({
  isWebSocketMessage: vi.fn().mockReturnValue(true),
}));

class MockWebSocketClass {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocketClass.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(public url: string) {}

  send = vi.fn(() => {});
  close = vi.fn(() => {});
}

let mockWsInstance: InstanceType<typeof MockWebSocketClass>;

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.resetModules();
    mockWsInstance = new MockWebSocketClass('ws://localhost:3000/ws');
    vi.stubGlobal('WebSocket', MockWebSocketClass);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('useWebSocket hook exists', async () => {
    const { useWebSocket } = await import('../../src/hooks/useWebSocket');
    expect(useWebSocket).toBeDefined();
  });
});
