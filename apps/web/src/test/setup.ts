import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Disable framer-motion animations in tests
// This makes animations complete instantly so elements are visible for assertions
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    // Replace motion components with their animated counterparts that skip animations
    motion: new Proxy(
      {},
      {
        get(_target, prop) {
          // Return a component that renders the HTML element directly
          const component = (actual as Record<string, unknown>).motion as Record<string, unknown>;
          const MotionComponent = component[prop as string];
          if (!MotionComponent) return undefined;
          // Return the original but with animations disabled via MotionConfig
          return MotionComponent;
        },
      }
    ),
    // Disable animations globally
    MotionGlobalConfig: { skipAnimations: true },
    // AnimatePresence just renders children
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    setTimeout(() => {
      if (this.onopen) this.onopen(new Event('open'));
    }, 0);
  }

  send(_data: string) {
    // Mock send
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose(new CloseEvent('close'));
  }
}

vi.stubGlobal('WebSocket', MockWebSocket);
