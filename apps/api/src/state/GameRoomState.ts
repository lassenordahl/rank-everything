import type { Room, Player, Item, RoomConfig } from '@rank-everything/shared-types';

export interface RoomState {
  room: Room | null;
  connections: Map<string, string>; // connectionId -> playerId
}

export class GameRoomState {
  constructor(public state: RoomState) {}

  get room() {
    return this.state.room;
  }

  get connections() {
    return this.state.connections;
  }

  createRoom(
    roomId: string,
    hostPlayerId: string,
    nickname: string,
    config: Partial<RoomConfig> = {}
  ) {
    const defaults: RoomConfig = {
      submissionMode: 'round-robin',
      timerEnabled: true,
      timerDuration: 60,
    };

    const roomConfig: RoomConfig = { ...defaults, ...config };
    const now = Date.now();

    this.state.room = {
      id: roomId,
      hostPlayerId, // Host is creating the room
      players: [
        {
          id: hostPlayerId,
          nickname,
          roomId,
          connected: true,
          rankings: {},
          joinedAt: now,
        },
      ],
      items: [],
      config: roomConfig,
      status: 'lobby',
      currentTurnPlayerId: null,
      currentTurnIndex: 0,
      timerEndAt: null,
      createdAt: now,
      lastActivityAt: now,
    };
  }

  addPlayer(player: Player) {
    if (!this.state.room) return;
    this.state.room.players.push(player);
    this.state.room.lastActivityAt = Date.now();
  }

  getPlayer(playerId: string) {
    return this.state.room?.players.find((p) => p.id === playerId);
  }

  removePlayer(playerId: string) {
    if (!this.state.room) return;

    const wasHost = this.state.room.hostPlayerId === playerId;
    this.state.room.players = this.state.room.players.filter((p) => p.id !== playerId);

    if (wasHost && this.state.room.players.length > 0) {
      // Migrate host to the next player (e.g., the one who joined earliest after the host)
      // Since players list is typically ordered by join time (push), [0] is the next oldest.
      this.state.room.hostPlayerId = this.state.room.players[0].id;
    }

    this.state.room.lastActivityAt = Date.now();
  }

  addItem(item: Item) {
    if (!this.state.room) return;
    this.state.room.items.push(item);
    this.state.room.lastActivityAt = Date.now();
  }

  // Helper to remove item (useful for tests or moderation)
  removeItem(itemId: string) {
    if (!this.state.room) return;
    this.state.room.items = this.state.room.items.filter((i) => i.id !== itemId);
    this.state.room.lastActivityAt = Date.now();
  }

  updatePlayerConnection(playerId: string, connected: boolean) {
    if (!this.state.room) return;
    const player = this.state.room.players.find((p) => p.id === playerId);
    if (player) {
      player.connected = connected;
    }
  }

  /**
   * Migrate host role to another connected player if the current host disconnects.
   * Returns true if host was migrated.
   */
  migrateHostIfNeeded(disconnectedPlayerId: string): boolean {
    if (!this.state.room) return false;
    if (this.state.room.hostPlayerId !== disconnectedPlayerId) return false;

    // Find first connected player that isn't the disconnected host
    const newHost = this.state.room.players.find(
      (p) => p.id !== disconnectedPlayerId && p.connected
    );

    if (newHost) {
      this.state.room.hostPlayerId = newHost.id;
      this.state.room.lastActivityAt = Date.now();
      return true;
    }
    return false;
  }

  startGame() {
    if (!this.state.room) return;
    this.state.room.status = 'in-progress';
    this.state.room.currentTurnIndex = 0;
    this.state.room.currentTurnPlayerId = this.state.room.players[0].id;
    this.state.room.timerEndAt = this.state.room.config.timerEnabled
      ? Date.now() + this.state.room.config.timerDuration * 1000
      : null;
    this.state.room.lastActivityAt = Date.now();
  }

  advanceTurn(): { previousTurnPlayerId: string; nextTurnPlayerId: string } | null {
    if (!this.state.room || !this.state.room.currentTurnPlayerId) return null;

    // Simple round robin
    this.state.room.currentTurnIndex =
      (this.state.room.currentTurnIndex + 1) % this.state.room.players.length;
    const nextPlayer = this.state.room.players[this.state.room.currentTurnIndex];
    if (!nextPlayer) return null; // Should not happen

    const previousTurnPlayerId = this.state.room.currentTurnPlayerId;
    this.state.room.currentTurnPlayerId = nextPlayer.id;
    this.state.room.timerEndAt = this.state.room.config.timerEnabled
      ? Date.now() + this.state.room.config.timerDuration * 1000
      : null;
    this.state.room.lastActivityAt = Date.now();

    return { previousTurnPlayerId, nextTurnPlayerId: nextPlayer.id };
  }

  checkTurnTimeout(now: number = Date.now()): boolean {
    if (!this.state.room || !this.state.room.timerEndAt) return false;

    if (now > this.state.room.timerEndAt) {
      this.advanceTurn();
      return true;
    }
    return false;
  }

  reset() {
    this.state.room = null;
    this.state.connections.clear();
  }
}
