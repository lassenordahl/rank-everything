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
      rankingTimeout: 15, // 15 seconds to rank each item
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
      rankingTimerEndAt: null,
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

  endGame() {
    if (!this.state.room) return;
    this.state.room.status = 'ended';
    this.state.room.currentTurnPlayerId = null;
    this.state.room.timerEndAt = null;
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

  /**
   * Start the ranking timer after an item is submitted.
   * All players have this time to rank the item.
   */
  startRankingTimer() {
    if (!this.state.room) return;
    if (this.state.room.config.rankingTimeout <= 0) return;

    this.state.room.rankingTimerEndAt = Date.now() + this.state.room.config.rankingTimeout * 1000;
  }

  /**
   * Clear the ranking timer.
   */
  clearRankingTimer() {
    if (!this.state.room) return;
    this.state.room.rankingTimerEndAt = null;
  }

  /**
   * Auto-assign a random available rank for a player on an item.
   * Returns the assigned rank, or null if already ranked or no slots available.
   */
  autoAssignRandomRank(playerId: string, itemId: string): number | null {
    if (!this.state.room) return null;
    const player = this.getPlayer(playerId);
    if (!player) return null;

    // Skip if already ranked
    if (player.rankings[itemId] !== undefined) return null;

    // Find available slots (1-10)
    const usedSlots = new Set(Object.values(player.rankings));
    const availableSlots = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((n) => !usedSlots.has(n));

    if (availableSlots.length === 0) return null;

    // Pick random slot
    const randomSlot = availableSlots[Math.floor(Math.random() * availableSlots.length)];
    player.rankings[itemId] = randomSlot;

    return randomSlot;
  }

  /**
   * Check if ranking timer has expired and auto-assign ranks if needed.
   * Returns true if timeout occurred and ranks were auto-assigned.
   */
  checkRankingTimeout(now: number = Date.now()): boolean {
    if (!this.state.room || !this.state.room.rankingTimerEndAt) return false;

    if (now < this.state.room.rankingTimerEndAt) return false;

    // Get the most recent item
    const latestItem = this.state.room.items[this.state.room.items.length - 1];
    if (!latestItem) {
      this.clearRankingTimer();
      return false;
    }

    // Auto-assign random ranks for players who haven't ranked
    let anyAssigned = false;
    this.state.room.players.forEach((player) => {
      if (player.rankings[latestItem.id] === undefined) {
        this.autoAssignRandomRank(player.id, latestItem.id);
        anyAssigned = true;
      }
    });

    // Clear timer
    this.clearRankingTimer();

    return anyAssigned;
  }
}
