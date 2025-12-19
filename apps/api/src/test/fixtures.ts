/**
 * Test Fixtures for Backend API
 *
 * Provides reusable mock data for testing server handlers.
 */

import type { Room, Player, Item, RoomConfig } from '@rank-everything/shared-types';

// ============================================================================
// PLAYER FIXTURES
// ============================================================================

export function createMockPlayer(overrides: Partial<Player> = {}): Player {
  const now = Date.now();
  return {
    id: `player-${Math.random().toString(36).substr(2, 9)}`,
    nickname: 'TestPlayer',
    roomId: 'ABCD',
    connected: true,
    rankings: {},
    joinedAt: now,
    ...overrides,
  };
}

export function createMockHost(overrides: Partial<Player> = {}): Player {
  return createMockPlayer({
    id: 'host-player',
    nickname: 'Host',
    ...overrides,
  });
}

// ============================================================================
// ROOM FIXTURES
// ============================================================================

export function createMockRoomConfig(overrides: Partial<RoomConfig> = {}): RoomConfig {
  return {
    submissionMode: 'round-robin',
    timerEnabled: true,
    timerDuration: 60,
    rankingTimeout: 15,
    ...overrides,
  };
}

export function createMockRoom(overrides: Partial<Room> = {}): Room {
  const now = Date.now();
  const host = createMockHost();

  return {
    id: 'ABCD',
    hostPlayerId: host.id,
    config: createMockRoomConfig(),
    status: 'lobby',
    players: [host],
    items: [],
    currentTurnPlayerId: null,
    currentTurnIndex: 0,
    timerEndAt: null,
    rankingTimerEndAt: null,
    createdAt: now,
    lastActivityAt: now,
    ...overrides,
  };
}

// ============================================================================
// ITEM FIXTURES
// ============================================================================

export function createMockItem(overrides: Partial<Item> = {}): Item {
  const now = Date.now();
  return {
    id: `item-${Math.random().toString(36).substr(2, 9)}`,
    text: 'Test Item',
    emoji: '🎲',
    submittedByPlayerId: 'host-player',
    submittedAt: now,
    roomId: 'ABCD',
    ...overrides,
  };
}

// ============================================================================
// MOCK CONNECTION
// ============================================================================

export function createMockConnection(id: string = 'conn-1') {
  return {
    id,
    send: vi.fn(),
    close: vi.fn(),
  };
}

// ============================================================================
// MOCK REQUEST HELPERS
// ============================================================================

export function createMockRequest(
  method: string,
  body?: unknown,
  headers: Record<string, string> = {}
): Request {
  const url = 'http://localhost:1999/party/ABCD';
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  return new Request(url, options);
}

export const mockRequests = {
  createRoom: (nickname: string = 'Host') =>
    createMockRequest('POST', { action: 'create', nickname }),

  joinRoom: (nickname: string = 'Player') =>
    createMockRequest('POST', { action: 'join', nickname }),

  startGame: () => createMockRequest('POST', { action: 'start' }),

  submitItem: (text: string = 'Test Item') => createMockRequest('POST', { action: 'submit', text }),

  rankItem: (itemId: string, ranking: number) =>
    createMockRequest('POST', { action: 'rank', itemId, ranking }),

  getRoom: () => createMockRequest('GET'),
};
