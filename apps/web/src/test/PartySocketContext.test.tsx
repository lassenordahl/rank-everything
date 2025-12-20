import { render, screen } from '@testing-library/react';
import { ConnectionStatusProvider } from '../contexts/ConnectionStatusContext';
import { PartySocketProvider, usePartySocketContext } from '../contexts/PartySocketContext';
import { vi } from 'vitest';
import React, { useEffect } from 'react';

// Mock partysocket
vi.mock('partysocket', () => {
  return {
    default: class MockPartySocket {
      options: unknown;
      listeners: Record<string, (event?: unknown) => void>;

      constructor(options: unknown) {
        this.options = options;
        this.listeners = {};
        setTimeout(() => {
          if (this.listeners['open']) {
            this.listeners['open']();
          }
        }, 10);
      }
      addEventListener(event: string, callback: (event?: unknown) => void) {
        this.listeners[event] = callback;
      }
      removeEventListener() {}
      close() {}
      send() {}
    },
  };
});

const TestComponent = () => {
  const { isConnected, joinRoom } = usePartySocketContext();

  useEffect(() => {
    joinRoom('test-room');
  }, [joinRoom]);

  return (
    <div>
      <span data-testid="status">{isConnected ? 'Connected' : 'Disconnected'}</span>
    </div>
  );
};

describe('PartySocketContext', () => {
  it('connects to the room', async () => {
    render(
      <ConnectionStatusProvider>
        <PartySocketProvider>
          <TestComponent />
        </PartySocketProvider>
      </ConnectionStatusProvider>
    );

    // Should initially be disconnected but connect shortly after
    expect(screen.getByTestId('status')).toBeInTheDocument();

    // Wait for mock socket to "connect"
    await screen.findByText('Connected');
  });
});
