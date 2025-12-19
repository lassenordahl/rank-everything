/**
 * Test Fixtures for Rank Everything
 *
 * Provides reusable mock data for testing based on PROJECT_SPEC.md data models.
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

export function createMockPlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) =>
    createMockPlayer({
      id: `player-${i}`,
      nickname: `Player${i + 1}`,
    })
  );
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

export function createMockItems(count: number): Item[] {
  const sampleItems = [
    { text: 'Pizza', emoji: '🍕' },
    { text: 'Sleeping in', emoji: '😴' },
    { text: 'First sip of coffee', emoji: '☕' },
    { text: 'Getting a haircut', emoji: '💇' },
    { text: 'Stepping on a Lego', emoji: '🧱' },
    { text: 'Finding money in old pants', emoji: '💵' },
    { text: 'Monday mornings', emoji: '😩' },
    { text: 'Bubble wrap', emoji: '📦' },
    { text: 'Free samples', emoji: '🛒' },
    { text: 'Warm socks from the dryer', emoji: '🧦' },
  ];

  return Array.from({ length: count }, (_, i) =>
    createMockItem({
      id: `item-${i}`,
      text: sampleItems[i % sampleItems.length].text,
      emoji: sampleItems[i % sampleItems.length].emoji,
      submittedByPlayerId: `player-${i % 4}`,
    })
  );
}

// ============================================================================
// ROOM CONFIG FIXTURES
// ============================================================================

export function createMockRoomConfig(overrides: Partial<RoomConfig> = {}): RoomConfig {
  return {
    submissionMode: 'round-robin',
    timerEnabled: true,
    timerDuration: 60,
    ...overrides,
  };
}

// ============================================================================
// ROOM FIXTURES
// ============================================================================

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
    createdAt: now,
    lastActivityAt: now,
    ...overrides,
  };
}

export function createMockLobbyRoom(playerCount: number = 2): Room {
  const players = createMockPlayers(playerCount);
  players[0].id = 'host-player';
  players[0].nickname = 'Host';

  return createMockRoom({
    players,
    hostPlayerId: 'host-player',
    status: 'lobby',
  });
}

export function createMockInProgressRoom(itemCount: number = 0): Room {
  const players = createMockPlayers(4);
  players[0].id = 'host-player';

  const items = createMockItems(itemCount);

  return createMockRoom({
    players,
    hostPlayerId: 'host-player',
    status: 'in-progress',
    items,
    currentTurnPlayerId: players[itemCount % players.length].id,
    currentTurnIndex: itemCount % players.length,
  });
}

export function createMockEndedRoom(): Room {
  const players = createMockPlayers(4);
  const items = createMockItems(10);

  // Add rankings for all players
  players.forEach((player, playerIdx) => {
    items.forEach((item, itemIdx) => {
      // Rotate rankings so each player has different rankings
      player.rankings[item.id] = ((itemIdx + playerIdx) % 10) + 1;
    });
  });

  return createMockRoom({
    players,
    items,
    status: 'ended',
    hostPlayerId: players[0].id,
  });
}

// ============================================================================
// WEBSOCKET EVENT FIXTURES
// ============================================================================

export const mockServerEvents = {
  roomUpdated: (room: Room) => ({
    type: 'room_updated' as const,
    room,
  }),

  playerJoined: (player: Player) => ({
    type: 'player_joined' as const,
    player,
  }),

  playerLeft: (playerId: string) => ({
    type: 'player_left' as const,
    playerId,
  }),

  itemSubmitted: (item: Item) => ({
    type: 'item_submitted' as const,
    item,
  }),

  turnChanged: (playerId: string, timerEndAt: number | null = null) => ({
    type: 'turn_changed' as const,
    playerId,
    timerEndAt,
  }),

  gameStarted: () => ({
    type: 'game_started' as const,
  }),

  gameEnded: () => ({
    type: 'game_ended' as const,
  }),

  error: (message: string, code?: string) => ({
    type: 'error' as const,
    message,
    code,
  }),
};

export const mockClientEvents = {
  submitItem: (text: string) => ({
    type: 'submit_item' as const,
    text,
  }),

  rankItem: (itemId: string, ranking: number) => ({
    type: 'rank_item' as const,
    itemId,
    ranking,
  }),

  skipTurn: () => ({
    type: 'skip_turn' as const,
  }),

  reconnect: (playerId: string) => ({
    type: 'reconnect' as const,
    playerId,
  }),
};

// ============================================================================
// API RESPONSE FIXTURES
// ============================================================================

export const mockApiResponses = {
  createRoom: (code: string = 'ABCD', playerId: string = 'host-player') => ({
    roomCode: code,
    playerId,
    room: createMockRoom({ id: code }),
  }),

  joinRoom: (playerId: string = 'player-1') => ({
    playerId,
    room: createMockLobbyRoom(2),
  }),

  startGame: () => ({
    room: createMockInProgressRoom(0),
  }),

  error: (message: string, code?: string) => ({
    error: message,
    code,
  }),
};

// ============================================================================
// LOCALSTORAGE MOCK HELPERS
// ============================================================================

export function mockLocalStorage(data: Record<string, string> = {}) {
  const store: Record<string, string> = { ...data };

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
    store,
  };
}

// ============================================================================
// ROOM CODE FIXTURES
// ============================================================================

export const validRoomCodes = ['ABCD', 'WXYZ', 'TEST', 'GAME', 'PLAY'];
export const invalidRoomCodes = ['abc', '123', 'ABCDE', 'AB', '', 'AB12'];
