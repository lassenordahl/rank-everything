/**
 * Tests for EmojiLLM Service
 *
 * Tests the worker-based emoji classification architecture.
 * Since the actual model loading happens in a worker (which requires a browser-like environment
 * and proper worker support), these tests focus on the message passing interface.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Worker class and import
const postMessageMock = vi.fn();
const terminateMock = vi.fn();

// We need a way to trigger onmessage from the test
let workerOnMessage: ((event: MessageEvent) => void) | null = null;

class MockWorker {
  postMessage = postMessageMock;
  terminate = terminateMock;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor() {
    // Capture the onmessage setter to simulate worker responses
    /* eslint-disable @typescript-eslint/no-this-alias */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const self = this;

    // We proxy the onmessage assignment to capture the handler
    return new Proxy(this, {
      set(target, prop, value) {
        if (prop === 'onmessage') {
          workerOnMessage = value;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (target as any)[prop] = value;
        return true;
      },
    });
  }
}

// Mock the import for the worker (using the optimized worker path)
vi.mock('./emojiWorkerOptimized?worker', () => ({
  default: MockWorker,
}));

describe('EmojiLLM', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    workerOnMessage = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize worker on first use', async () => {
    // Re-import to get a fresh instance if possible, or just use the singleton
    // Since it's a singleton, we might be sharing state across tests, so we need to be careful
    // For this test file, we'll just test the interaction
    const { emojiLLM } = await import('../lib/emojiLLM');

    // Trigger initialization
    const initPromise = emojiLLM.initialize();

    // Worker should be instantiated (implied by the mock being used) and receive initialize message
    expect(postMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'initialize',
      })
    );

    // Simulate worker ready response
    if (workerOnMessage) {
      workerOnMessage({ data: { type: 'ready' } } as MessageEvent);
    }

    await initPromise;
    expect(emojiLLM.state.state).toBe('ready');
  });

  it('should send classify message and return result', async () => {
    const { emojiLLM } = await import('../lib/emojiLLM');

    // Simulate ready state if not already
    if (!emojiLLM.ready) {
      const initPromise = emojiLLM.initialize();
      if (workerOnMessage) {
        workerOnMessage({ data: { type: 'ready' } } as MessageEvent);
      }
      await initPromise;
    }

    // Start classification
    const classifyPromise = emojiLLM.classifyEmoji('pizza');

    // Should verify postMessage was called with correct data
    expect(postMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'classify',
        text: 'pizza',
      })
    );

    // Extract the ID from the last call to respond correctly
    const lastCall = postMessageMock.mock.calls[postMessageMock.mock.calls.length - 1][0];
    const requestId = lastCall.id;

    // Simulate worker result
    if (workerOnMessage) {
      workerOnMessage({
        data: {
          type: 'result',
          emoji: '🍕',
          id: requestId,
        },
      } as MessageEvent);
    }

    const result = await classifyPromise;
    expect(result).toBe('🍕');
  });

  it('should handle timeout gracefully', async () => {
    const { emojiLLM } = await import('../lib/emojiLLM');
    vi.useFakeTimers();

    // Ensure ready
    if (!emojiLLM.ready) {
      const initPromise = emojiLLM.initialize();
      if (workerOnMessage) {
        workerOnMessage({ data: { type: 'ready' } } as MessageEvent);
      }
      await initPromise;
    }

    const classifyPromise = emojiLLM.classifyEmoji('slow request');

    // Fast forward time past 10s timeout
    vi.advanceTimersByTime(11000);

    // Should resolve with fallback
    const result = await classifyPromise;
    expect(result).toBe('🎲');

    vi.useRealTimers();
  });
});
