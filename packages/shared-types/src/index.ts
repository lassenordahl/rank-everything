// Room types
export type RoomStatus = 'lobby' | 'in-progress' | 'ended';
export type SubmissionMode = 'round-robin' | 'host-only';

export interface RoomConfig {
  submissionMode: SubmissionMode;
  timerEnabled: boolean;
  timerDuration: number; // seconds - for turn/submission timer
  rankingTimeout: number; // seconds - how long players have to rank each item (0 = disabled)
  itemsPerGame: number; // number of items to submit before game ends (default: 10)
}

export interface Room {
  id: string; // 4-letter code
  hostPlayerId: string;
  config: RoomConfig;
  status: RoomStatus;
  players: Player[];
  items: Item[];
  currentTurnPlayerId: string | null;
  currentTurnIndex: number;
  timerEndAt: number | null;
  rankingTimerEndAt: number | null; // When current item ranking is due
  createdAt: number;
  lastActivityAt: number;
}

// Player types
export interface Player {
  id: string;
  nickname: string;
  roomId: string;
  connected: boolean;
  rankings: Record<string, number>; // itemId -> ranking (1-10)
  joinedAt: number;
  isCatchingUp?: boolean; // true if player joined mid-game and hasn't ranked all existing items
}

// Item types
export interface Item {
  id: string;
  text: string;
  emoji: string;
  submittedByPlayerId: string;
  submittedAt: number;
  roomId: string;
}

// Global item pool (for random roll)
export interface GlobalItem {
  id: string;
  text: string;
  emoji: string;
  createdAt: number;
}

// KV cache types
export interface RoomMetadata {
  exists: boolean;
  status: RoomStatus;
  playerCount: number;
  createdAt: number;
  expiresAt: number;
}

// API request/response types
export interface CreateRoomRequest {
  nickname: string;
  config?: Partial<RoomConfig>;
}

export interface CreateRoomResponse {
  roomCode: string;
  playerId: string;
  room: Room;
}

export interface JoinRoomRequest {
  nickname: string;
}

export interface JoinRoomResponse {
  playerId: string;
  room: Room;
}

export interface SubmitItemRequest {
  text: string;
}

export interface RankItemRequest {
  itemId: string;
  ranking: number; // 1-10
}

export interface RandomItemsResponse {
  items: GlobalItem[];
}

// WebSocket event types
export type ClientEvent =
  | { type: 'submit_item'; text: string }
  | { type: 'rank_item'; itemId: string; ranking: number }
  | { type: 'start_game' }
  | { type: 'reconnect'; playerId: string }
  | { type: 'skip_turn' }
  | { type: 'reset_room' }
  | { type: 'update_config'; config: Partial<RoomConfig> }
  | { type: 'ping' }; // Heartbeat ping

export type ServerEvent =
  | { type: 'room_updated'; room: Room }
  | { type: 'item_submitted'; item: Item }
  | { type: 'player_joined'; player: Player }
  | { type: 'player_left'; playerId: string }
  | { type: 'player_reconnected'; playerId: string }
  | { type: 'turn_changed'; playerId: string; timerEndAt: number | null }
  | { type: 'timer_tick'; secondsRemaining: number }
  | { type: 'game_started' }
  | { type: 'game_ended' }
  | { type: 'room_reset'; room: Room }
  | { type: 'config_updated'; config: RoomConfig }
  | { type: 'pong' } // Heartbeat pong response
  | { type: 'error'; message: string; code?: string };

// Error codes
export const ErrorCodes = {
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_FULL: 'ROOM_FULL',
  GAME_ALREADY_STARTED: 'GAME_ALREADY_STARTED',
  NOT_YOUR_TURN: 'NOT_YOUR_TURN',
  INVALID_RANKING: 'INVALID_RANKING',
  RANKING_SLOT_TAKEN: 'RANKING_SLOT_TAKEN',
  DUPLICATE_ITEM: 'DUPLICATE_ITEM',
  ITEM_TOO_LONG: 'ITEM_TOO_LONG',
  NOT_HOST: 'NOT_HOST',
  NOT_ENOUGH_PLAYERS: 'NOT_ENOUGH_PLAYERS',
  PLAYER_NOT_FOUND: 'PLAYER_NOT_FOUND',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// Constants
export const ROOM_CODE_LENGTH = 4;
export const MAX_RANKING_SLOTS = 10;
export const MIN_PLAYERS = 2;
export const DEFAULT_TIMER_DURATION = 60;
export const DEFAULT_ROOM_TTL_MINUTES = 10;
export const DEFAULT_ITEMS_PER_GAME = 10;

// Client Logging Types
export interface ClientLogEntry {
  id: string;
  sessionId: string;
  timestamp: number;
  level: 'error' | 'warn' | 'info';
  type:
    | 'unhandled_error'
    | 'unhandled_rejection'
    | 'error_boundary'
    | 'websocket'
    | 'webgpu'
    | 'console'
    | 'page_hidden'
    | 'page_hide'
    | 'crash_test'
    | 'test'
    | 'verification_test';
  message: string;
  stack?: string;
  componentStack?: string;
  context?: Record<string, unknown>;
  userAgent: string;
  roomCode?: string;
  url: string;
}

export interface ClientLogRequest {
  logs: Omit<ClientLogEntry, 'id'>[];
}
