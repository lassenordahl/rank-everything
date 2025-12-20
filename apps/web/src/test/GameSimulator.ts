/**
 * Game Simulator - Handles for running complete game simulations
 *
 * Provides a test harness for simulating full game flows with 1-N players,
 * handling connect/disconnect scenarios, and verifying state at each step.
 */

import type { Room, Player, Item, RoomConfig } from '@rank-everything/shared-types';

// ============================================================================
// GAME SIMULATOR CLASS
// ============================================================================

export interface GameEvent {
  type: string;
  timestamp: number;
  playerId?: string;
  data?: unknown;
}

export interface SimulationResult {
  room: Room;
  events: GameEvent[];
  errors: string[];
  duration: number;
}

export class GameSimulator {
  private room: Room;
  private events: GameEvent[] = [];
  private errors: string[] = [];
  private startTime: number;
  private itemIdCounter = 0;

  constructor(roomId: string = 'ABCD', hostNickname: string = 'Host') {
    this.startTime = Date.now();

    // Create room first with empty players
    this.room = {
      id: roomId,
      hostPlayerId: 'host-player',
      config: {
        submissionMode: 'round-robin',
        timerEnabled: true,
        timerDuration: 60,
        rankingTimeout: 15,
        itemsPerGame: 10,
      },
      status: 'lobby',
      players: [],
      items: [],
      currentTurnPlayerId: null,
      currentTurnIndex: 0,
      timerEndAt: null,
      rankingTimerEndAt: null,
      createdAt: this.startTime,
      lastActivityAt: this.startTime,
    } as Room;

    // Now create host player (room is initialized)
    const host = this.createPlayer('host-player', hostNickname);
    this.room.players.push(host);

    this.logEvent('room_created', { roomId, hostNickname });
  }

  // ============================================================================
  // PLAYER MANAGEMENT
  // ============================================================================

  private createPlayer(id: string, nickname: string): Player {
    return {
      id,
      nickname,
      roomId: this.room.id,
      connected: true,
      rankings: {},
      joinedAt: Date.now(),
    };
  }

  addPlayer(nickname: string): { success: boolean; playerId?: string; error?: string } {
    // Don't allow joining ended games
    if (this.room.status === 'ended') {
      const error = 'Cannot join: game already ended';
      this.errors.push(error);
      return { success: false, error };
    }

    const playerId = `player-${this.room.players.length}`;
    const player = this.createPlayer(playerId, nickname);

    // If game is in progress with items, this is a late join
    if (this.room.status === 'in-progress' && this.room.items.length > 0) {
      player.isCatchingUp = true;
    }

    this.room.players.push(player);
    this.room.lastActivityAt = Date.now();

    this.logEvent('player_joined', { playerId, nickname, isCatchingUp: player.isCatchingUp });
    return { success: true, playerId };
  }

  removePlayer(playerId: string): { success: boolean; error?: string } {
    const playerIndex = this.room.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) {
      const error = `Player ${playerId} not found`;
      this.errors.push(error);
      return { success: false, error };
    }

    if (playerId === this.room.hostPlayerId) {
      // Transfer host to next player if possible
      if (this.room.players.length > 1) {
        const nextHost = this.room.players.find((p) => p.id !== playerId);
        if (nextHost) {
          this.room.hostPlayerId = nextHost.id;
          this.logEvent('host_transferred', { newHostId: nextHost.id });
        }
      }
    }

    this.room.players.splice(playerIndex, 1);
    this.room.lastActivityAt = Date.now();
    this.logEvent('player_left', { playerId });

    // Handle turn if it was this player's turn
    if (this.room.currentTurnPlayerId === playerId && this.room.status === 'in-progress') {
      this.advanceTurn();
    }

    return { success: true };
  }

  disconnectPlayer(playerId: string): { success: boolean; error?: string } {
    const player = this.room.players.find((p) => p.id === playerId);
    if (!player) {
      const error = `Player ${playerId} not found`;
      this.errors.push(error);
      return { success: false, error };
    }

    player.connected = false;
    this.logEvent('player_disconnected', { playerId });
    return { success: true };
  }

  reconnectPlayer(playerId: string): { success: boolean; error?: string } {
    const player = this.room.players.find((p) => p.id === playerId);
    if (!player) {
      const error = `Player ${playerId} not found`;
      this.errors.push(error);
      return { success: false, error };
    }

    player.connected = true;
    this.logEvent('player_reconnected', { playerId });
    return { success: true };
  }

  // ============================================================================
  // GAME STATE MANAGEMENT
  // ============================================================================

  configure(config: Partial<RoomConfig>): void {
    this.room.config = { ...this.room.config, ...config };
    this.logEvent('room_configured', { config });
  }

  startGame(): { success: boolean; error?: string } {
    if (this.room.status !== 'lobby') {
      const error = 'Game already started';
      this.errors.push(error);
      return { success: false, error };
    }

    if (this.room.players.length < 1) {
      const error = 'Not enough players';
      this.errors.push(error);
      return { success: false, error };
    }

    this.room.status = 'in-progress';
    this.room.currentTurnIndex = 0;
    this.room.currentTurnPlayerId = this.room.players[0].id;
    this.room.lastActivityAt = Date.now();

    this.logEvent('game_started', {
      playerCount: this.room.players.length,
      firstTurn: this.room.currentTurnPlayerId,
    });

    return { success: true };
  }

  // ============================================================================
  // ITEM SUBMISSION
  // ============================================================================

  submitItem(
    playerId: string,
    text: string,
    emoji: string = '🎲'
  ): { success: boolean; itemId?: string; error?: string } {
    if (this.room.status !== 'in-progress') {
      const error = 'Game not in progress';
      this.errors.push(error);
      return { success: false, error };
    }

    // Check if it's this player's turn (for round-robin)
    if (this.room.config.submissionMode === 'round-robin') {
      if (this.room.currentTurnPlayerId !== playerId) {
        const error = `Not ${playerId}'s turn`;
        this.errors.push(error);
        return { success: false, error };
      }
    } else if (this.room.config.submissionMode === 'host-only') {
      if (playerId !== this.room.hostPlayerId) {
        const error = 'Only host can submit items';
        this.errors.push(error);
        return { success: false, error };
      }
    }

    // Check for duplicates
    const isDuplicate = this.room.items.some(
      (item) => item.text.toLowerCase() === text.toLowerCase()
    );
    if (isDuplicate) {
      const error = 'Duplicate item';
      this.errors.push(error);
      return { success: false, error };
    }

    // Validate text length
    if (text.length > 100) {
      const error = 'Item text too long (max 100 characters)';
      this.errors.push(error);
      return { success: false, error };
    }

    const itemId = `item-${this.itemIdCounter++}`;
    const item: Item = {
      id: itemId,
      text,
      emoji,
      submittedByPlayerId: playerId,
      submittedAt: Date.now(),
      roomId: this.room.id,
    };

    this.room.items.push(item);
    this.room.lastActivityAt = Date.now();

    this.logEvent('item_submitted', { itemId, text, playerId });

    // Check for game end - NO, wait for ranking!
    // But stop asking for submissions if limit reached.
    if (this.room.items.length < this.room.config.itemsPerGame) {
      this.advanceTurn();
    }

    return { success: true, itemId };
  }

  // ============================================================================
  // RANKING
  // ============================================================================

  rankItem(
    playerId: string,
    itemId: string,
    ranking: number
  ): { success: boolean; error?: string } {
    if (this.room.status !== 'in-progress' && this.room.status !== 'ended') {
      const error = 'Game not in progress';
      this.errors.push(error);
      return { success: false, error };
    }

    const player = this.room.players.find((p) => p.id === playerId);
    if (!player) {
      const error = `Player ${playerId} not found`;
      this.errors.push(error);
      return { success: false, error };
    }

    const item = this.room.items.find((i) => i.id === itemId);
    if (!item) {
      const error = `Item ${itemId} not found`;
      this.errors.push(error);
      return { success: false, error };
    }

    if (ranking < 1 || ranking > 10) {
      const error = 'Ranking must be between 1 and 10';
      this.errors.push(error);
      return { success: false, error };
    }

    // Check if ranking slot is already used
    const existingRanking = Object.entries(player.rankings).find(([_, r]) => r === ranking);
    if (existingRanking) {
      const error = `Ranking slot ${ranking} already used`;
      this.errors.push(error);
      return { success: false, error };
    }

    // Check if item is already ranked
    if (player.rankings[itemId] !== undefined) {
      const error = 'Item already ranked (rankings are permanent)';
      this.errors.push(error);
      return { success: false, error };
    }

    player.rankings[itemId] = ranking;
    this.logEvent('item_ranked', { playerId, itemId, ranking });

    // Check if player caught up after ranking
    this.checkPlayerCaughtUp(playerId);

    // Check game end: all players must have ranked all items AND be caught up
    const itemsTarget = this.room.config.itemsPerGame;
    const allDone = this.room.players.every((p) => {
      const rankCount = Object.keys(p.rankings).length;
      const isCaughtUp = !p.isCatchingUp;
      return rankCount >= itemsTarget && isCaughtUp;
    });

    if (this.room.items.length >= itemsTarget && allDone) {
      this.endGame();
    }

    return { success: true };
  }

  // ============================================================================
  // TURN MANAGEMENT
  // ============================================================================

  private advanceTurn(): void {
    if (this.room.config.submissionMode === 'host-only') {
      // Turn stays with host
      return;
    }

    // Find active players (connected AND not catching up)
    const activePlayers = this.room.players.filter((p) => p.connected && !p.isCatchingUp);
    if (activePlayers.length === 0) {
      return;
    }

    // Find current player's position in the FULL players array
    const currentFullIndex = this.room.players.findIndex(
      (p) => p.id === this.room.currentTurnPlayerId
    );

    // Find next active player starting from position after current
    let nextPlayer = null;
    for (let i = 1; i <= this.room.players.length; i++) {
      const checkIndex = (currentFullIndex + i) % this.room.players.length;
      const candidate = this.room.players[checkIndex];
      if (candidate && candidate.connected && !candidate.isCatchingUp) {
        nextPlayer = candidate;
        break;
      }
    }

    if (!nextPlayer) return;

    // Update turn index to match position in full players array
    this.room.currentTurnIndex = this.room.players.findIndex((p) => p.id === nextPlayer.id);
    this.room.currentTurnPlayerId = nextPlayer.id;

    this.logEvent('turn_changed', {
      playerId: this.room.currentTurnPlayerId,
      turnIndex: this.room.currentTurnIndex,
    });
  }

  skipTurn(): void {
    if (this.room.status !== 'in-progress') return;
    this.logEvent('turn_skipped', { playerId: this.room.currentTurnPlayerId });
    this.advanceTurn();
  }

  // ============================================================================
  // GAME END
  // ============================================================================

  private endGame(): void {
    this.room.status = 'ended';
    this.room.lastActivityAt = Date.now();

    this.logEvent('game_ended', {
      itemCount: this.room.items.length,
      playerCount: this.room.players.length,
    });
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private logEvent(type: string, data?: unknown): void {
    this.events.push({
      type,
      timestamp: Date.now(),
      data,
    });
  }

  getRoom(): Room {
    return { ...this.room };
  }

  /**
   * Get items that a player has not yet ranked.
   */
  getMissedItems(playerId: string): string[] {
    const player = this.getPlayer(playerId);
    if (!player) return [];
    return this.room.items
      .filter((item) => player.rankings[item.id] === undefined)
      .map((item) => item.id);
  }

  /**
   * Check if a late joiner has caught up (ranked all existing items).
   * If so, sets isCatchingUp = false.
   */
  checkPlayerCaughtUp(playerId: string): boolean {
    const player = this.getPlayer(playerId);
    if (!player || !player.isCatchingUp) return false;

    const missedItems = this.getMissedItems(playerId);
    if (missedItems.length === 0) {
      player.isCatchingUp = false;
      this.logEvent('player_caught_up', { playerId });
      return true;
    }
    return false;
  }

  getPlayer(playerId: string): Player | undefined {
    return this.room.players.find((p) => p.id === playerId);
  }

  getCurrentTurnPlayer(): Player | undefined {
    return this.room.players.find((p) => p.id === this.room.currentTurnPlayerId);
  }

  getResult(): SimulationResult {
    return {
      room: { ...this.room },
      events: [...this.events],
      errors: [...this.errors],
      duration: Date.now() - this.startTime,
    };
  }

  // ============================================================================
  // ASSERTIONS
  // ============================================================================

  assertStatus(expected: Room['status']): void {
    if (this.room.status !== expected) {
      throw new Error(`Expected status '${expected}', got '${this.room.status}'`);
    }
  }

  assertPlayerCount(expected: number): void {
    if (this.room.players.length !== expected) {
      throw new Error(`Expected ${expected} players, got ${this.room.players.length}`);
    }
  }

  assertItemCount(expected: number): void {
    if (this.room.items.length !== expected) {
      throw new Error(`Expected ${expected} items, got ${this.room.items.length}`);
    }
  }

  assertCurrentTurn(playerId: string): void {
    if (this.room.currentTurnPlayerId !== playerId) {
      throw new Error(`Expected turn for '${playerId}', got '${this.room.currentTurnPlayerId}'`);
    }
  }

  assertNoErrors(): void {
    if (this.errors.length > 0) {
      throw new Error(`Unexpected errors: ${this.errors.join(', ')}`);
    }
  }

  assertAllPlayersRankedItem(itemId: string): void {
    for (const player of this.room.players) {
      if (player.rankings[itemId] === undefined) {
        throw new Error(`Player ${player.nickname} has not ranked item ${itemId}`);
      }
    }
  }

  assertPlayerRankings(playerId: string, expected: number): void {
    const player = this.getPlayer(playerId);
    if (!player) throw new Error(`Player ${playerId} not found`);

    const count = Object.keys(player.rankings).length;
    if (count !== expected) {
      throw new Error(`Expected ${expected} rankings for ${playerId}, got ${count}`);
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function runFullGame(
  playerCount: number,
  config: Partial<RoomConfig> = {}
): SimulationResult {
  const sim = new GameSimulator();

  // Configure
  sim.configure(config);

  // Add players
  for (let i = 1; i < playerCount; i++) {
    sim.addPlayer(`Player${i + 1}`);
  }

  // Start game
  sim.startGame();

  // Play 10 rounds
  const items = [
    'Pizza',
    'Coffee',
    'Sleeping in',
    'Mondays',
    'Free samples',
    'Traffic',
    'Beach',
    'Snow',
    'Chocolate',
    'Exercise',
  ];

  for (let i = 0; i < 10; i++) {
    const currentPlayer = sim.getCurrentTurnPlayer();
    if (!currentPlayer) break;

    // Submit item
    const result = sim.submitItem(currentPlayer.id, items[i], '🎲');
    if (!result.success) break;

    // All players rank the item
    const room = sim.getRoom();
    room.players.forEach((player, pIdx) => {
      const ranking = ((i + pIdx) % 10) + 1;
      // Only rank if slot is available
      const existingRankings = Object.values(player.rankings);
      if (!existingRankings.includes(ranking) && result.itemId) {
        const rankRes = sim.rankItem(player.id, result.itemId, ranking);
        if (!rankRes.success) {
          console.error(
            `Rank failed: Player ${player.id} Item ${result.itemId} Rank ${ranking} - ${rankRes.error}`
          );
        }
      }
    });
  }

  return sim.getResult();
}

export function createGameWithPlayers(count: number): GameSimulator {
  const sim = new GameSimulator();
  for (let i = 1; i < count; i++) {
    sim.addPlayer(`Player${i + 1}`);
  }
  return sim;
}
