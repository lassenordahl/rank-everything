/**
 * Test Utilities for Rank Everything
 *
 * Provides helper functions for testing React components and hooks.
 */

import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PartySocketProvider } from '../contexts/PartySocketContext';

// ============================================================================
// CUSTOM RENDER WITH PROVIDERS
// ============================================================================

interface TestProvidersProps {
  children: React.ReactNode;
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function TestProviders({ children }: TestProvidersProps) {
  const queryClient = createTestQueryClient();

  return React.createElement(QueryClientProvider, { client: queryClient },
    React.createElement(PartySocketProvider, null,
      React.createElement(BrowserRouter, null, children)
    )
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: TestProviders, ...options });
}

// ============================================================================
// MOCK FETCH UTILITY
// ============================================================================

export function createMockFetch() {
  const mockFn = vi.fn();

  return {
    mock: mockFn,

    mockSuccess: (data: unknown) => {
      mockFn.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(data),
      });
    },

    mockError: (message: string, status: number = 400) => {
      mockFn.mockResolvedValueOnce({
        ok: false,
        status,
        json: () => Promise.resolve({ error: message }),
      });
    },

    mockNetworkError: () => {
      mockFn.mockRejectedValueOnce(new Error('Network error'));
    },

    reset: () => {
      mockFn.mockReset();
    },

    install: () => {
      vi.stubGlobal('fetch', mockFn);
    },

    restore: () => {
      vi.unstubAllGlobals();
    },
  };
}

// ============================================================================
// MOCK WEBSOCKET UTILITY
// ============================================================================

export function createMockWebSocket() {
  const listeners: Record<string, Function[]> = {
    open: [],
    message: [],
    close: [],
    error: [],
  };

  const instance = {
    readyState: WebSocket.OPEN,
    url: '',

    send: vi.fn(),
    close: vi.fn(),

    addEventListener: (event: string, callback: Function) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(callback);
    },

    removeEventListener: (event: string, callback: Function) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter(cb => cb !== callback);
      }
    },

    // Test helpers
    simulateOpen: () => {
      listeners.open.forEach(cb => cb(new Event('open')));
    },

    simulateMessage: (data: unknown) => {
      const messageData = typeof data === 'string' ? data : JSON.stringify(data);
      listeners.message.forEach(cb => cb(new MessageEvent('message', { data: messageData })));
    },

    simulateClose: () => {
      instance.readyState = WebSocket.CLOSED;
      listeners.close.forEach(cb => cb(new CloseEvent('close')));
    },

    simulateError: () => {
      listeners.error.forEach(cb => cb(new Event('error')));
    },
  };

  // Make it work like a real WebSocket class
  class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    readyState = instance.readyState;
    url: string;

    onopen: ((event: Event) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onclose: ((event: CloseEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;

    constructor(url: string) {
      this.url = url;
      instance.url = url;

      // Wire up the event handlers
      setTimeout(() => {
        if (this.onopen) {
          instance.addEventListener('open', this.onopen);
          instance.simulateOpen();
        }
      }, 0);
    }

    send(data: string) {
      instance.send(data);
    }

    close() {
      instance.close();
      instance.simulateClose();
    }
  }

  return {
    MockWebSocket,
    instance,
    install: () => {
      vi.stubGlobal('WebSocket', MockWebSocket);
    },
  };
}

// ============================================================================
// WAIT UTILITIES
// ============================================================================

export function waitForMs(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function waitForCondition(
  condition: () => boolean,
  timeout: number = 1000,
  interval: number = 50
): Promise<void> {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Condition not met within timeout');
    }
    await waitForMs(interval);
  }
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

export function expectApiCall(
  mockFetch: ReturnType<typeof vi.fn>,
  expectedUrl: string | RegExp,
  expectedOptions?: Partial<RequestInit>
) {
  expect(mockFetch).toHaveBeenCalled();

  const [url, options] = mockFetch.mock.calls[0];

  if (typeof expectedUrl === 'string') {
    expect(url).toContain(expectedUrl);
  } else {
    expect(url).toMatch(expectedUrl);
  }

  if (expectedOptions) {
    expect(options).toMatchObject(expectedOptions);
  }
}

export function expectWebSocketMessage(
  mockSend: ReturnType<typeof vi.fn>,
  expectedMessage: Record<string, unknown>
) {
  expect(mockSend).toHaveBeenCalled();

  const lastCall = mockSend.mock.calls[mockSend.mock.calls.length - 1];
  const sentData = JSON.parse(lastCall[0]);

  expect(sentData).toMatchObject(expectedMessage);
}
