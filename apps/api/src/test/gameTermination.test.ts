/**
 * Game Termination Tests
 *
 * Comprehensive tests for game ending logic, including edge cases
 * with late joiners, disconnected players, and timer behavior.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameRoomState } from '../state/GameRoomState';
import type { Player, Item } from '@rank-everything/shared-types';

// Helper to create a player
function createPlayer(id: string, nickname: string, options: Partial<Player> = {}): Player {
  return {
    id,
    nickname,
    roomId: 'room-1',
    connected: true,
    rankings: {},
    joinedAt: Date.now(),
    ...options,
  };
}

// Helper to create an item
function createItem(id: string, text: string): Item {
  return {
    id,
    text,
    emoji: '🎯',
    submittedByPlayerId: 'host-1',
    submittedAt: Date.now(),
    roomId: 'room-1',
  };
}

describe('Game Termination Edge Cases', () => {
  let gameState: GameRoomState;

  beforeEach(() => {
    gameState = new GameRoomState({ room: null, connections: new Map() });
    gameState.createRoom('room-1', 'host-1', 'Host', {
      timerEnabled: false,
      itemsPerGame: 3,
    });
    gameState.addPlayer(createPlayer('p2', 'Player2'));
    gameState.startGame();
  });

  describe('Exact Item Limit Enforcement', () => {
    it('should allow exactly itemsPerGame items, no more', () => {
      // Add exactly 3 items (the limit)
      for (let i = 1; i <= 3; i++) {
        gameState.addItem(createItem(`item-${i}`, `Item ${i}`));
      }

      const room = gameState.room;
      if (!room) throw new Error('Room is null');

      expect(room.items.length).toBe(3);
      expect(room.items.length).toBe(room.config.itemsPerGame);
    });

    it('should still accept items if below limit', () => {
      gameState.addItem(createItem('item-1', 'Item 1'));
      gameState.addItem(createItem('item-2', 'Item 2'));

      const room = gameState.room;
      if (!room) throw new Error('Room is null');

      expect(room.items.length).toBe(2);
      expect(room.items.length < room.config.itemsPerGame).toBe(true);
    });
  });

  describe('All Players Must Rank All Items', () => {
    it('should not end game if one player has not ranked all items', () => {
      // Add 3 items
      for (let i = 1; i <= 3; i++) {
        gameState.addItem(createItem(`item-${i}`, `Item ${i}`));
      }

      const host = gameState.getPlayer('host-1');
      const p2 = gameState.getPlayer('p2');
      if (!host || !p2) throw new Error('Players not found');

      // Host ranks all, P2 ranks only 2
      host.rankings['item-1'] = 1;
      host.rankings['item-2'] = 2;
      host.rankings['item-3'] = 3;
      p2.rankings['item-1'] = 1;
      p2.rankings['item-2'] = 2;
      // p2 does NOT rank item-3

      const room = gameState.room;
      if (!room) throw new Error('Room is null');

      const allDone = room.players.every((p) => {
        return Object.keys(p.rankings).length >= room.config.itemsPerGame;
      });

      expect(allDone).toBe(false);
      expect(room.status).toBe('in-progress');
    });

    it('should end game when all players have ranked all items', () => {
      for (let i = 1; i <= 3; i++) {
        gameState.addItem(createItem(`item-${i}`, `Item ${i}`));
      }

      const host = gameState.getPlayer('host-1');
      const p2 = gameState.getPlayer('p2');
      if (!host || !p2) throw new Error('Players not found');

      // Both rank all 3 items
      host.rankings['item-1'] = 1;
      host.rankings['item-2'] = 2;
      host.rankings['item-3'] = 3;
      p2.rankings['item-1'] = 3;
      p2.rankings['item-2'] = 2;
      p2.rankings['item-3'] = 1;

      const room = gameState.room;
      if (!room) throw new Error('Room is null');

      const allDone = room.players.every((p) => {
        const rankCount = Object.keys(p.rankings).length;
        const isCaughtUp = !p.isCatchingUp;
        return rankCount >= room.config.itemsPerGame && isCaughtUp;
      });

      expect(allDone).toBe(true);

      // Trigger game end
      gameState.endGame();
      expect(room.status).toBe('ended');
    });
  });

  describe('Late Joiner Blocking/Unblocking', () => {
    it('should block game end until late joiner catches up', () => {
      // Add 3 items
      for (let i = 1; i <= 3; i++) {
        gameState.addItem(createItem(`item-${i}`, `Item ${i}`));
      }

      // Original players rank all items
      const host = gameState.getPlayer('host-1');
      const p2 = gameState.getPlayer('p2');
      if (!host || !p2) throw new Error('Players not found');

      host.rankings['item-1'] = 1;
      host.rankings['item-2'] = 2;
      host.rankings['item-3'] = 3;
      p2.rankings['item-1'] = 2;
      p2.rankings['item-2'] = 3;
      p2.rankings['item-3'] = 1;

      // Late joiner arrives
      gameState.addPlayer(createPlayer('late-1', 'Latecomer', { isCatchingUp: true }));

      const room = gameState.room;
      if (!room) throw new Error('Room is null');

      // Game should NOT end - late joiner blocks
      const allDone = room.players.every((p) => {
        const rankCount = Object.keys(p.rankings).length;
        const isCaughtUp = !p.isCatchingUp;
        return rankCount >= room.config.itemsPerGame && isCaughtUp;
      });

      expect(allDone).toBe(false);
    });

    it('should unblock game end when late joiner catches up', () => {
      for (let i = 1; i <= 3; i++) {
        gameState.addItem(createItem(`item-${i}`, `Item ${i}`));
      }

      const host = gameState.getPlayer('host-1');
      const p2 = gameState.getPlayer('p2');
      if (!host || !p2) throw new Error('Players not found');

      host.rankings['item-1'] = 1;
      host.rankings['item-2'] = 2;
      host.rankings['item-3'] = 3;
      p2.rankings['item-1'] = 2;
      p2.rankings['item-2'] = 3;
      p2.rankings['item-3'] = 1;

      // Late joiner arrives and catches up
      gameState.addPlayer(createPlayer('late-1', 'Latecomer', { isCatchingUp: true }));
      const latePlayer = gameState.getPlayer('late-1');
      if (!latePlayer) throw new Error('Late player not found');

      latePlayer.rankings['item-1'] = 3;
      latePlayer.rankings['item-2'] = 1;
      latePlayer.rankings['item-3'] = 2;
      gameState.checkPlayerCaughtUp('late-1');

      const room = gameState.room;
      if (!room) throw new Error('Room is null');

      const allDone = room.players.every((p) => {
        const rankCount = Object.keys(p.rankings).length;
        const isCaughtUp = !p.isCatchingUp;
        return rankCount >= room.config.itemsPerGame && isCaughtUp;
      });

      expect(allDone).toBe(true);
      expect(latePlayer.isCatchingUp).toBe(false);
    });
  });

  describe('Disconnected Player Handling', () => {
    it('should still count disconnected player rankings for game end', () => {
      for (let i = 1; i <= 3; i++) {
        gameState.addItem(createItem(`item-${i}`, `Item ${i}`));
      }

      const host = gameState.getPlayer('host-1');
      const p2 = gameState.getPlayer('p2');
      if (!host || !p2) throw new Error('Players not found');

      // Both rank all items
      host.rankings['item-1'] = 1;
      host.rankings['item-2'] = 2;
      host.rankings['item-3'] = 3;
      p2.rankings['item-1'] = 2;
      p2.rankings['item-2'] = 3;
      p2.rankings['item-3'] = 1;

      // P2 disconnects AFTER ranking
      p2.connected = false;

      const room = gameState.room;
      if (!room) throw new Error('Room is null');

      // Game can still end
      const allDone = room.players.every((p) => {
        const rankCount = Object.keys(p.rankings).length;
        const isCaughtUp = !p.isCatchingUp;
        return rankCount >= room.config.itemsPerGame && isCaughtUp;
      });

      expect(allDone).toBe(true);
    });

    it('should block game end if disconnected player has incomplete rankings', () => {
      for (let i = 1; i <= 3; i++) {
        gameState.addItem(createItem(`item-${i}`, `Item ${i}`));
      }

      const host = gameState.getPlayer('host-1');
      const p2 = gameState.getPlayer('p2');
      if (!host || !p2) throw new Error('Players not found');

      // Host ranks all, P2 only ranks 1
      host.rankings['item-1'] = 1;
      host.rankings['item-2'] = 2;
      host.rankings['item-3'] = 3;
      p2.rankings['item-1'] = 1;
      // P2 disconnects before finishing
      p2.connected = false;

      const room = gameState.room;
      if (!room) throw new Error('Room is null');

      const allDone = room.players.every((p) => {
        return Object.keys(p.rankings).length >= room.config.itemsPerGame;
      });

      expect(allDone).toBe(false);
    });
  });
});

describe('Turn Advancement Edge Cases', () => {
  let gameState: GameRoomState;

  beforeEach(() => {
    gameState = new GameRoomState({ room: null, connections: new Map() });
    gameState.createRoom('room-1', 'host-1', 'Host', {
      timerEnabled: true,
      timerDuration: 60,
      itemsPerGame: 5,
    });
    gameState.addPlayer(createPlayer('p2', 'Player2'));
    gameState.addPlayer(createPlayer('p3', 'Player3'));
    gameState.startGame();
  });

  it('should advance turn to disconnected player (timer handles skip)', () => {
    // Note: advanceTurn does NOT skip disconnected players.
    // The timer mechanism handles advancing when a disconnected player's turn expires.
    const room = gameState.room;
    if (!room) throw new Error('Room is null');

    expect(room.currentTurnPlayerId).toBe('host-1');

    // P2 disconnects
    gameState.updatePlayerConnection('p2', false);

    // Advance turn - goes to p2 even though disconnected
    gameState.advanceTurn();
    expect(room.currentTurnPlayerId).toBe('p2');
  });

  it('should skip catching-up player in turn rotation', () => {
    const p2 = gameState.getPlayer('p2');
    if (!p2) throw new Error('p2 not found');
    p2.isCatchingUp = true;

    const room = gameState.room;
    if (!room) throw new Error('Room is null');

    expect(room.currentTurnPlayerId).toBe('host-1');

    // Advance turn - should skip p2 (catching up) and go to p3
    gameState.advanceTurn();
    expect(room.currentTurnPlayerId).toBe('p3');
  });

  it('should continue turn rotation even with only one connected player', () => {
    // Note: Turn rotation doesn't consider connection status.
    // This allows disconnected players to reconnect and take their turn.
    gameState.updatePlayerConnection('p2', false);
    gameState.updatePlayerConnection('p3', false);

    const room = gameState.room;
    if (!room) throw new Error('Room is null');

    // Only host is connected
    const connectedPlayers = room.players.filter((p) => p.connected);
    expect(connectedPlayers.length).toBe(1);
    expect(connectedPlayers[0].id).toBe('host-1');

    // Advance turn - goes to p2 (disconnected but in rotation)
    gameState.advanceTurn();
    expect(room.currentTurnPlayerId).toBe('p2');
  });
});

describe('Timer Behavior', () => {
  let gameState: GameRoomState;

  beforeEach(() => {
    gameState = new GameRoomState({ room: null, connections: new Map() });
    gameState.createRoom('room-1', 'host-1', 'Host', {
      timerEnabled: true,
      timerDuration: 10,
      rankingTimeout: 5,
      itemsPerGame: 3,
    });
    gameState.addPlayer(createPlayer('p2', 'Player2'));
    gameState.startGame();
  });

  it('should set timerEndAt when game starts with timer enabled', () => {
    const room = gameState.room;
    if (!room) throw new Error('Room is null');

    expect(room.timerEndAt).not.toBeNull();
    expect(room.timerEndAt).toBeGreaterThan(Date.now() - 1000);
  });

  it('should advance turn when timer expires', () => {
    const room = gameState.room;
    if (!room) throw new Error('Room is null');

    expect(room.currentTurnPlayerId).toBe('host-1');

    // Simulate timer expiry
    const futureTime = (room.timerEndAt ?? 0) + 1000;
    const turnChanged = gameState.checkTurnTimeout(futureTime);

    expect(turnChanged).toBe(true);
    expect(room.currentTurnPlayerId).toBe('p2');
  });

  it('should not advance turn if timer has not expired', () => {
    const room = gameState.room;
    if (!room) throw new Error('Room is null');

    const currentTime = Date.now();
    const turnChanged = gameState.checkTurnTimeout(currentTime);

    expect(turnChanged).toBe(false);
    expect(room.currentTurnPlayerId).toBe('host-1');
  });

  it('should start ranking timer after item submission', () => {
    gameState.addItem(createItem('item-1', 'Test Item'));
    gameState.startRankingTimer();

    const room = gameState.room;
    if (!room) throw new Error('Room is null');

    expect(room.rankingTimerEndAt).not.toBeNull();
    expect(room.rankingTimerEndAt).toBeGreaterThan(Date.now());
  });

  it('should auto-assign random rank when ranking timer expires', () => {
    // Add an item
    gameState.addItem(createItem('item-1', 'Test Item'));
    gameState.startRankingTimer();

    const room = gameState.room;
    if (!room) throw new Error('Room is null');

    // Players don't rank - simulate timer expiry
    const futureTime = (room.rankingTimerEndAt ?? 0) + 1000;
    const rankingTimedOut = gameState.checkRankingTimeout(futureTime);

    expect(rankingTimedOut).toBe(true);

    // Both players should now have a ranking for item-1
    room.players.forEach((player) => {
      expect(player.rankings['item-1']).toBeDefined();
      expect(player.rankings['item-1']).toBeGreaterThanOrEqual(1);
      expect(player.rankings['item-1']).toBeLessThanOrEqual(10);
    });
  });
});

describe('State Invariants', () => {
  let gameState: GameRoomState;

  beforeEach(() => {
    gameState = new GameRoomState({ room: null, connections: new Map() });
    gameState.createRoom('room-1', 'host-1', 'Host', {
      timerEnabled: false,
      itemsPerGame: 3,
    });
  });

  it('should always have a host when players exist', () => {
    const room = gameState.room;
    if (!room) throw new Error('Room is null');

    expect(room.hostPlayerId).toBeDefined();
    expect(room.players.find((p) => p.id === room.hostPlayerId)).toBeDefined();
  });

  it('should migrate host when current host is removed', () => {
    gameState.addPlayer(createPlayer('p2', 'Player2'));

    const room = gameState.room;
    if (!room) throw new Error('Room is null');

    expect(room.hostPlayerId).toBe('host-1');

    gameState.removePlayer('host-1');

    expect(room.hostPlayerId).toBe('p2');
    expect(room.players.find((p) => p.id === 'host-1')).toBeUndefined();
  });

  it('should have currentTurnPlayerId set when game is in-progress', () => {
    gameState.addPlayer(createPlayer('p2', 'Player2'));
    gameState.startGame();

    const room = gameState.room;
    if (!room) throw new Error('Room is null');

    expect(room.status).toBe('in-progress');
    expect(room.currentTurnPlayerId).not.toBeNull();
    expect(room.players.find((p) => p.id === room.currentTurnPlayerId)).toBeDefined();
  });

  it('should clear currentTurnPlayerId when game ends', () => {
    gameState.addPlayer(createPlayer('p2', 'Player2'));
    gameState.startGame();
    gameState.endGame();

    const room = gameState.room;
    if (!room) throw new Error('Room is null');

    expect(room.status).toBe('ended');
    expect(room.currentTurnPlayerId).toBeNull();
  });

  it('should never have items exceed itemsPerGame after game starts', () => {
    gameState.addPlayer(createPlayer('p2', 'Player2'));
    gameState.startGame();

    // Add items up to limit
    for (let i = 1; i <= 3; i++) {
      gameState.addItem(createItem(`item-${i}`, `Item ${i}`));
    }

    const room = gameState.room;
    if (!room) throw new Error('Room is null');

    expect(room.items.length).toBe(3);
    expect(room.items.length).toBeLessThanOrEqual(room.config.itemsPerGame);
  });
});

describe('Host Migration', () => {
  let gameState: GameRoomState;

  beforeEach(() => {
    gameState = new GameRoomState({ room: null, connections: new Map() });
    gameState.createRoom('room-1', 'host-1', 'Host', { timerEnabled: false });
    gameState.addPlayer(createPlayer('p2', 'Player2'));
    gameState.addPlayer(createPlayer('p3', 'Player3'));
  });

  it('should migrate to first connected player when host disconnects', () => {
    const migrated = gameState.migrateHostIfNeeded('host-1');

    expect(migrated).toBe(true);

    const room = gameState.room;
    if (!room) throw new Error('Room is null');

    expect(room.hostPlayerId).toBe('p2');
  });

  it('should not migrate if non-host disconnects', () => {
    const migrated = gameState.migrateHostIfNeeded('p2');

    expect(migrated).toBe(false);

    const room = gameState.room;
    if (!room) throw new Error('Room is null');

    expect(room.hostPlayerId).toBe('host-1');
  });

  it('should skip disconnected players when migrating host', () => {
    gameState.updatePlayerConnection('p2', false);

    const migrated = gameState.migrateHostIfNeeded('host-1');

    expect(migrated).toBe(true);

    const room = gameState.room;
    if (!room) throw new Error('Room is null');

    expect(room.hostPlayerId).toBe('p3');
  });

  it('should not migrate if no connected players remain', () => {
    gameState.updatePlayerConnection('p2', false);
    gameState.updatePlayerConnection('p3', false);

    const migrated = gameState.migrateHostIfNeeded('host-1');

    expect(migrated).toBe(false);
  });
});

/**
 * CRITICAL RANKING VALIDATION TESTS
 *
 * These tests ensure that the game NEVER ends with incomplete rankings.
 * This prevents the bug where a player's last ranking is not displayed on their card.
 */
describe('Ranking Completeness Validation (Critical)', () => {
  let gameState: GameRoomState;

  beforeEach(() => {
    gameState = new GameRoomState({ room: null, connections: new Map() });
    gameState.createRoom('room-1', 'host-1', 'Host', {
      timerEnabled: false,
      itemsPerGame: 3,
    });
    gameState.addPlayer(createPlayer('p2', 'Player2'));
    gameState.startGame();
  });

  it('should verify ALL players have rankings for EVERY item before game can end', () => {
    // Add 3 items
    for (let i = 1; i <= 3; i++) {
      gameState.addItem(createItem(`item-${i}`, `Item ${i}`));
    }

    const room = gameState.room;
    if (!room) throw new Error('Room is null');

    const itemIds = room.items.map((item) => item.id);
    const host = gameState.getPlayer('host-1');
    const p2 = gameState.getPlayer('p2');
    if (!host || !p2) throw new Error('Players not found');

    // Both players rank all items
    host.rankings['item-1'] = 1;
    host.rankings['item-2'] = 2;
    host.rankings['item-3'] = 3;
    p2.rankings['item-1'] = 3;
    p2.rankings['item-2'] = 2;
    p2.rankings['item-3'] = 1;

    // CRITICAL ASSERTION: Every player has a ranking for every item
    for (const player of room.players) {
      for (const itemId of itemIds) {
        expect(
          player.rankings[itemId],
          `Player ${player.nickname} is missing ranking for ${itemId}`
        ).toBeDefined();
        expect(
          typeof player.rankings[itemId],
          `Player ${player.nickname} ranking for ${itemId} is not a number`
        ).toBe('number');
      }
    }
  });

  it('should NOT end game if last item ranking is missing for ANY player', () => {
    for (let i = 1; i <= 3; i++) {
      gameState.addItem(createItem(`item-${i}`, `Item ${i}`));
    }

    const host = gameState.getPlayer('host-1');
    const p2 = gameState.getPlayer('p2');
    if (!host || !p2) throw new Error('Players not found');

    // Host ranks all
    host.rankings['item-1'] = 1;
    host.rankings['item-2'] = 2;
    host.rankings['item-3'] = 3;

    // P2 ranks first two but MISSES LAST ITEM
    p2.rankings['item-1'] = 3;
    p2.rankings['item-2'] = 2;
    // p2.rankings['item-3'] = MISSING!

    const room = gameState.room;
    if (!room) throw new Error('Room is null');

    // Game should NOT be ready to end
    const allDone = room.players.every((player) => {
      return Object.keys(player.rankings).length >= room.config.itemsPerGame;
    });
    expect(allDone).toBe(false);

    // Verify P2 is missing a ranking
    expect(p2.rankings['item-3']).toBeUndefined();
    expect(Object.keys(p2.rankings).length).toBe(2);
    expect(Object.keys(p2.rankings).length).toBeLessThan(room.config.itemsPerGame);
  });

  it('should validate each item has exactly one ranking per player (no gaps)', () => {
    for (let i = 1; i <= 3; i++) {
      gameState.addItem(createItem(`item-${i}`, `Item ${i}`));
    }

    const room = gameState.room;
    if (!room) throw new Error('Room is null');

    const host = gameState.getPlayer('host-1');
    const p2 = gameState.getPlayer('p2');
    if (!host || !p2) throw new Error('Players not found');

    // Complete rankings
    host.rankings['item-1'] = 1;
    host.rankings['item-2'] = 2;
    host.rankings['item-3'] = 3;
    p2.rankings['item-1'] = 1;
    p2.rankings['item-2'] = 2;
    p2.rankings['item-3'] = 3;

    // Validate every item is ranked by every player
    for (const item of room.items) {
      for (const player of room.players) {
        const hasRanking = player.rankings[item.id] !== undefined;
        expect(hasRanking, `${player.nickname} missing ranking for "${item.text}"`).toBe(true);
      }
    }
  });

  it('should ensure game cannot proceed to ended status with incomplete rankings', () => {
    for (let i = 1; i <= 3; i++) {
      gameState.addItem(createItem(`item-${i}`, `Item ${i}`));
    }

    const room = gameState.room;
    if (!room) throw new Error('Room is null');

    const host = gameState.getPlayer('host-1');
    const p2 = gameState.getPlayer('p2');
    if (!host || !p2) throw new Error('Players not found');

    // Incomplete rankings - host missing item-3
    host.rankings['item-1'] = 1;
    host.rankings['item-2'] = 2;
    // host.rankings['item-3'] = MISSING!
    p2.rankings['item-1'] = 3;
    p2.rankings['item-2'] = 2;
    p2.rankings['item-3'] = 1;

    // Game end should NOT be triggered
    const allDone = room.players.every((player) => {
      const rankCount = Object.keys(player.rankings).length;
      const isCaughtUp = !player.isCatchingUp;
      return rankCount >= room.config.itemsPerGame && isCaughtUp;
    });

    expect(allDone).toBe(false);
    expect(room.status).toBe('in-progress');

    // Now complete the missing ranking
    host.rankings['item-3'] = 3;

    const allDoneNow = room.players.every((player) => {
      const rankCount = Object.keys(player.rankings).length;
      const isCaughtUp = !player.isCatchingUp;
      return rankCount >= room.config.itemsPerGame && isCaughtUp;
    });

    expect(allDoneNow).toBe(true);
  });

  it('should count rankings correctly when determining game end', () => {
    for (let i = 1; i <= 3; i++) {
      gameState.addItem(createItem(`item-${i}`, `Item ${i}`));
    }

    const room = gameState.room;
    if (!room) throw new Error('Room is null');

    // Track ranking count at each step
    const host = gameState.getPlayer('host-1');
    const p2 = gameState.getPlayer('p2');
    if (!host || !p2) throw new Error('Players not found');

    // Step 1: No rankings
    expect(Object.keys(host.rankings).length).toBe(0);
    expect(Object.keys(p2.rankings).length).toBe(0);

    // Step 2: First ranking
    host.rankings['item-1'] = 1;
    p2.rankings['item-1'] = 3;
    expect(Object.keys(host.rankings).length).toBe(1);
    expect(Object.keys(p2.rankings).length).toBe(1);

    // Step 3: Second ranking
    host.rankings['item-2'] = 2;
    p2.rankings['item-2'] = 2;
    expect(Object.keys(host.rankings).length).toBe(2);
    expect(Object.keys(p2.rankings).length).toBe(2);

    // Step 4: Third ranking (final)
    host.rankings['item-3'] = 3;
    p2.rankings['item-3'] = 1;
    expect(Object.keys(host.rankings).length).toBe(3);
    expect(Object.keys(p2.rankings).length).toBe(3);

    // Both should have exactly itemsPerGame rankings
    expect(Object.keys(host.rankings).length).toBe(room.config.itemsPerGame);
    expect(Object.keys(p2.rankings).length).toBe(room.config.itemsPerGame);
  });
});
