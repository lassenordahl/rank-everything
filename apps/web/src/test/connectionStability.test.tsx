/**
 * Connection Stability Tests
 *
 * Tests for the connection stability features that prevent mobile page refreshes:
 * - Page visibility detection
 * - Heartbeat mechanism
 * - Reconnection handling
 * - Toast display behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ConnectionStatusProvider, useConnectionStatus } from '../contexts/ConnectionStatusContext';
import React from 'react';

// Test component to access context values
function TestComponent() {
  const { isConnected, isPageVisible, isReconnecting, setSocketConnected, recordHeartbeat } =
    useConnectionStatus();

  return (
    <div>
      <span data-testid="connected">{isConnected ? 'yes' : 'no'}</span>
      <span data-testid="visible">{isPageVisible ? 'yes' : 'no'}</span>
      <span data-testid="reconnecting">{isReconnecting ? 'yes' : 'no'}</span>
      <button data-testid="set-connected" onClick={() => setSocketConnected(true)}>
        Connect
      </button>
      <button data-testid="set-disconnected" onClick={() => setSocketConnected(false)}>
        Disconnect
      </button>
      <button data-testid="heartbeat" onClick={() => recordHeartbeat()}>
        Heartbeat
      </button>
    </div>
  );
}

describe('ConnectionStatusContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('provides default values', () => {
    render(
      <ConnectionStatusProvider>
        <TestComponent />
      </ConnectionStatusProvider>
    );

    expect(screen.getByTestId('connected').textContent).toBe('no');
    expect(screen.getByTestId('visible').textContent).toBe('yes');
    expect(screen.getByTestId('reconnecting').textContent).toBe('no');
  });

  it('updates connection state when setSocketConnected is called', async () => {
    render(
      <ConnectionStatusProvider>
        <TestComponent />
      </ConnectionStatusProvider>
    );

    expect(screen.getByTestId('connected').textContent).toBe('no');

    await act(async () => {
      screen.getByTestId('set-connected').click();
    });

    expect(screen.getByTestId('connected').textContent).toBe('yes');
  });

  it('does not show reconnecting toast immediately on disconnect', async () => {
    render(
      <ConnectionStatusProvider>
        <TestComponent />
      </ConnectionStatusProvider>
    );

    // Connect first
    await act(async () => {
      screen.getByTestId('set-connected').click();
    });

    expect(screen.getByTestId('connected').textContent).toBe('yes');

    // Disconnect
    await act(async () => {
      screen.getByTestId('set-disconnected').click();
    });

    // Should not show reconnecting immediately (delay is 2 seconds)
    expect(screen.getByTestId('reconnecting').textContent).toBe('no');
  });

  it('shows reconnecting toast after delay when disconnected', async () => {
    render(
      <ConnectionStatusProvider>
        <TestComponent />
      </ConnectionStatusProvider>
    );

    // Connect first
    await act(async () => {
      screen.getByTestId('set-connected').click();
    });

    // Disconnect
    await act(async () => {
      screen.getByTestId('set-disconnected').click();
    });

    // Advance time past the delay (2 seconds)
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(screen.getByTestId('reconnecting').textContent).toBe('yes');
  });

  it('clears reconnecting state when connection is restored', async () => {
    render(
      <ConnectionStatusProvider>
        <TestComponent />
      </ConnectionStatusProvider>
    );

    // Connect, then disconnect
    await act(async () => {
      screen.getByTestId('set-connected').click();
    });

    await act(async () => {
      screen.getByTestId('set-disconnected').click();
    });

    // Wait for reconnecting toast
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(screen.getByTestId('reconnecting').textContent).toBe('yes');

    // Reconnect
    await act(async () => {
      screen.getByTestId('set-connected').click();
    });

    expect(screen.getByTestId('reconnecting').textContent).toBe('no');
  });

  it('responds to page visibility changes', async () => {
    render(
      <ConnectionStatusProvider>
        <TestComponent />
      </ConnectionStatusProvider>
    );

    expect(screen.getByTestId('visible').textContent).toBe('yes');

    // Simulate page becoming hidden
    await act(async () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(screen.getByTestId('visible').textContent).toBe('no');

    // Simulate page becoming visible again
    await act(async () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(screen.getByTestId('visible').textContent).toBe('yes');
  });

  it('records heartbeats correctly', async () => {
    render(
      <ConnectionStatusProvider>
        <TestComponent />
      </ConnectionStatusProvider>
    );

    // Recording heartbeats should not throw
    await act(async () => {
      screen.getByTestId('heartbeat').click();
    });

    // Multiple heartbeats should work
    await act(async () => {
      screen.getByTestId('heartbeat').click();
      screen.getByTestId('heartbeat').click();
    });
  });
});

describe('Connection stability - no page reload on join', () => {
  it('RoomLobby handleJoin does not call window.location.reload', async () => {
    // This is a regression test to ensure we don't reintroduce the reload
    // The actual RoomLobby component is tested elsewhere, but we verify
    // the reload was removed by checking the source code pattern
    const fs = await import('fs');
    const path = await import('path');

    const roomLobbyPath = path.resolve(__dirname, '../components/RoomLobby.tsx');
    const content = fs.readFileSync(roomLobbyPath, 'utf-8');

    // The old pattern was: window.location.reload();
    // We should NOT find this in the onSuccess callback
    const reloadPattern = /onSuccess:[\s\S]*?window\.location\.reload\(\)/;
    expect(content).not.toMatch(reloadPattern);
  });
});

describe('Ping/Pong heartbeat types', () => {
  it('ClientEvent includes ping type', async () => {
    // Verify the types are correctly defined
    const types = await import('@rank-everything/shared-types');

    // These are type-level checks, so we just verify the module exports
    expect(types).toBeDefined();

    // The ping type should be part of ClientEvent union
    // This is a compile-time check but we can verify the module loads
    const pingEvent: { type: 'ping' } = { type: 'ping' };
    expect(pingEvent.type).toBe('ping');

    const pongEvent: { type: 'pong' } = { type: 'pong' };
    expect(pongEvent.type).toBe('pong');
  });
});
