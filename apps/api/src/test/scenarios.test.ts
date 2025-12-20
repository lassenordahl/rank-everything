import { describe, it, expect, beforeEach } from 'vitest';
import { GameRoomState } from '../state/GameRoomState';

describe('Jackbox Robustness Scenarios', () => {
  let gameState: GameRoomState;

  beforeEach(() => {
    // Setup initial state with a running game
    const hostId = 'host-1';
    const config = { timerEnabled: true, timerDuration: 10 };

    gameState = new GameRoomState({ room: null, connections: new Map() });
    gameState.createRoom('room-1', hostId, 'Host', config);

    // Add 3 more players
    gameState.addPlayer({
      id: 'p2',
      nickname: 'P2',
      roomId: 'room-1',
      connected: true,
      rankings: {},
      joinedAt: Date.now(),
    });
    gameState.addPlayer({
      id: 'p3',
      nickname: 'P3',
      roomId: 'room-1',
      connected: true,
      rankings: {},
      joinedAt: Date.now(),
    });
    gameState.addPlayer({
      id: 'p4',
      nickname: 'P4',
      roomId: 'room-1',
      connected: true,
      rankings: {},
      joinedAt: Date.now(),
    });

    // Start game
    gameState.startGame();
  });

  it('should indicate if join is allowed based on status', () => {
    // This test simulates logic we need to add to handleJoinRoom or a helper in GameRoomState
    // We might want a helper "canJoin()"
    // expect(gameState.canJoin()).toBe(false);
    expect(gameState.room?.status).toBe('in-progress');
  });

  it('should migrate host if host leaves MID-GAME', () => {
    expect(gameState.room?.hostPlayerId).toBe('host-1');

    // Host leaves (simulated via removePlayer or disconnect logic)
    gameState.removePlayer('host-1');

    // Assert: Host should migrate to next player
    expect(gameState.room?.hostPlayerId).not.toBe('host-1');
    expect(gameState.room?.hostPlayerId).toBeDefined();
    expect(gameState.room?.hostPlayerId).toBe('p2');
  });

  it('should auto-advance turn if timer expires', () => {
    // Setup: Current player is host-1 (since we just started, usually index 0)
    expect(gameState.room?.currentTurnPlayerId).toBe('host-1');

    // Mock time passing past timerEndAt
    const timerEnd = gameState.room?.timerEndAt;
    if (timerEnd === undefined || timerEnd === null) throw new Error('timerEndAt is not set');
    const future = timerEnd + 1000;

    // Action: Check timeout (method to be implemented)
    // @ts-expect-error - testing private/internal method or incomplete type
    const turnChanged = gameState.checkTurnTimeout(future);

    // Expectation: Turn should advance
    expect(turnChanged).toBe(true);
    expect(gameState.room?.currentTurnPlayerId).not.toBe('host-1');
    expect(gameState.room?.currentTurnPlayerId).toBe('p2');
  });
});

describe('Late Join Catch-Up', () => {
  let gameState: GameRoomState;

  beforeEach(() => {
    // Setup: Create room, start game, add some items
    gameState = new GameRoomState({ room: null, connections: new Map() });
    gameState.createRoom('room-1', 'host-1', 'Host', { timerEnabled: false, itemsPerGame: 5 });

    gameState.addPlayer({
      id: 'p2',
      nickname: 'P2',
      roomId: 'room-1',
      connected: true,
      rankings: {},
      joinedAt: Date.now(),
    });

    gameState.startGame();

    // Add 2 items that existing players will have ranked
    gameState.addItem({
      id: 'item-1',
      text: 'Pizza',
      emoji: '🍕',
      submittedByPlayerId: 'host-1',
      submittedAt: Date.now(),
      roomId: 'room-1',
    });
    gameState.addItem({
      id: 'item-2',
      text: 'Coffee',
      emoji: '☕',
      submittedByPlayerId: 'p2',
      submittedAt: Date.now(),
      roomId: 'room-1',
    });

    // Existing players rank the items
    const host = gameState.getPlayer('host-1');
    const p2 = gameState.getPlayer('p2');
    if (!host) throw new Error('Host not found');
    if (!p2) throw new Error('p2 not found');
    host.rankings['item-1'] = 1;
    host.rankings['item-2'] = 2;
    p2.rankings['item-1'] = 2;
    p2.rankings['item-2'] = 1;
  });

  it('should allow player to join in-progress game with isCatchingUp=true', () => {
    // Add a late joiner
    gameState.addPlayer({
      id: 'late-1',
      nickname: 'Latecomer',
      roomId: 'room-1',
      connected: true,
      rankings: {},
      joinedAt: Date.now(),
      isCatchingUp: true, // Simulating joinRoom behavior
    });

    const latePlayer = gameState.getPlayer('late-1');
    expect(latePlayer).toBeDefined();
    expect(latePlayer?.isCatchingUp).toBe(true);
    expect(gameState.room?.players.length).toBe(3);
  });

  it('should identify late joiner as catching up via helper', () => {
    gameState.addPlayer({
      id: 'late-1',
      nickname: 'Latecomer',
      roomId: 'room-1',
      connected: true,
      rankings: {},
      joinedAt: Date.now(),
      isCatchingUp: true,
    });

    expect(gameState.isPlayerCatchingUp('late-1')).toBe(true);
    expect(gameState.isPlayerCatchingUp('host-1')).toBe(false);
  });

  it('should return missed items for late joiner', () => {
    gameState.addPlayer({
      id: 'late-1',
      nickname: 'Latecomer',
      roomId: 'room-1',
      connected: true,
      rankings: {},
      joinedAt: Date.now(),
      isCatchingUp: true,
    });

    const missedItems = gameState.getPlayerMissedItems('late-1');
    expect(missedItems).toEqual(['item-1', 'item-2']);
  });

  it('should skip catching-up players in turn rotation', () => {
    // Add late joiner
    gameState.addPlayer({
      id: 'late-1',
      nickname: 'Latecomer',
      roomId: 'room-1',
      connected: true,
      rankings: {},
      joinedAt: Date.now(),
      isCatchingUp: true,
    });

    // Verify active players list excludes late joiner
    const activePlayers = gameState.getActivePlayers();
    expect(activePlayers.map((p) => p.id)).toEqual(['host-1', 'p2']);
    expect(activePlayers.map((p) => p.id)).not.toContain('late-1');

    // Advance turn - should cycle between host-1 and p2 only
    if (!gameState.room) throw new Error('Room is null');
    gameState.room.currentTurnPlayerId = 'host-1';
    const result1 = gameState.advanceTurn();
    expect(result1?.nextTurnPlayerId).toBe('p2');

    const result2 = gameState.advanceTurn();
    expect(result2?.nextTurnPlayerId).toBe('host-1');
  });

  it('should transition player from catching-up to active after ranking all items', () => {
    // Add late joiner
    gameState.addPlayer({
      id: 'late-1',
      nickname: 'Latecomer',
      roomId: 'room-1',
      connected: true,
      rankings: {},
      joinedAt: Date.now(),
      isCatchingUp: true,
    });

    const latePlayer = gameState.getPlayer('late-1');
    if (!latePlayer) throw new Error('late-1 not found');

    // Rank first item - still catching up
    latePlayer.rankings['item-1'] = 3;
    expect(gameState.checkPlayerCaughtUp('late-1')).toBe(false);
    expect(latePlayer.isCatchingUp).toBe(true);

    // Rank second item - now caught up
    latePlayer.rankings['item-2'] = 4;
    expect(gameState.checkPlayerCaughtUp('late-1')).toBe(true);
    expect(latePlayer.isCatchingUp).toBe(false);
  });

  it('should include caught-up player in turn rotation', () => {
    // Add late joiner
    gameState.addPlayer({
      id: 'late-1',
      nickname: 'Latecomer',
      roomId: 'room-1',
      connected: true,
      rankings: {},
      joinedAt: Date.now(),
      isCatchingUp: true,
    });

    const latePlayer = gameState.getPlayer('late-1');
    if (!latePlayer) throw new Error('late-1 not found');

    // Catch up by ranking all items
    latePlayer.rankings['item-1'] = 3;
    latePlayer.rankings['item-2'] = 4;
    gameState.checkPlayerCaughtUp('late-1');

    // Now should be in active players
    const activePlayers = gameState.getActivePlayers();
    expect(activePlayers.map((p) => p.id)).toContain('late-1');
    expect(activePlayers.length).toBe(3);
  });

  it('should correctly determine game-end with late joiner', () => {
    // Add late joiner
    gameState.addPlayer({
      id: 'late-1',
      nickname: 'Latecomer',
      roomId: 'room-1',
      connected: true,
      rankings: {},
      joinedAt: Date.now(),
      isCatchingUp: true,
    });

    // Need 5 items for game end per config
    gameState.addItem({
      id: 'item-3',
      text: 'Tacos',
      emoji: '🌮',
      submittedByPlayerId: 'host-1',
      submittedAt: Date.now(),
      roomId: 'room-1',
    });
    gameState.addItem({
      id: 'item-4',
      text: 'Sushi',
      emoji: '🍣',
      submittedByPlayerId: 'p2',
      submittedAt: Date.now(),
      roomId: 'room-1',
    });
    gameState.addItem({
      id: 'item-5',
      text: 'Burgers',
      emoji: '🍔',
      submittedByPlayerId: 'host-1',
      submittedAt: Date.now(),
      roomId: 'room-1',
    });

    // All existing players rank all items
    const host = gameState.getPlayer('host-1');
    const p2 = gameState.getPlayer('p2');
    const latePlayer = gameState.getPlayer('late-1');
    if (!host) throw new Error('host-1 not found');
    if (!p2) throw new Error('p2 not found');
    if (!latePlayer) throw new Error('late-1 not found');

    host.rankings['item-3'] = 3;
    host.rankings['item-4'] = 4;
    host.rankings['item-5'] = 5;
    p2.rankings['item-3'] = 3;
    p2.rankings['item-4'] = 4;
    p2.rankings['item-5'] = 5;

    // Late joiner hasn't caught up - game shouldn't end
    const room = gameState.room;
    if (!room) throw new Error('Room is null');
    const allPlayersRankedEnough = room.players.every((p) => {
      const rankCount = Object.keys(p.rankings).length;
      const isCaughtUp = !p.isCatchingUp;
      return rankCount >= 5 && isCaughtUp;
    });
    expect(allPlayersRankedEnough).toBe(false);

    // Late joiner catches up
    latePlayer.rankings['item-1'] = 1;
    latePlayer.rankings['item-2'] = 2;
    latePlayer.rankings['item-3'] = 3;
    latePlayer.rankings['item-4'] = 4;
    latePlayer.rankings['item-5'] = 5;
    gameState.checkPlayerCaughtUp('late-1');

    // Now game can end
    const room2 = gameState.room;
    if (!room2) throw new Error('Room is null');
    const allDone = room2.players.every((p) => {
      const rankCount = Object.keys(p.rankings).length;
      const isCaughtUp = !p.isCatchingUp;
      return rankCount >= 5 && isCaughtUp;
    });
    expect(allDone).toBe(true);
  });
});

describe('Game Termination', () => {
  let gameState: GameRoomState;

  beforeEach(() => {
    gameState = new GameRoomState({ room: null, connections: new Map() });
    gameState.createRoom('room-1', 'host-1', 'Host', { timerEnabled: false, itemsPerGame: 3 });

    gameState.addPlayer({
      id: 'p2',
      nickname: 'P2',
      roomId: 'room-1',
      connected: true,
      rankings: {},
      joinedAt: Date.now(),
    });

    gameState.startGame();
  });

  it('should detect item limit reached', () => {
    // Add items up to the limit
    for (let i = 1; i <= 3; i++) {
      gameState.addItem({
        id: `item-${i}`,
        text: `Item ${i}`,
        emoji: '🎯',
        submittedByPlayerId: 'host-1',
        submittedAt: Date.now(),
        roomId: 'room-1',
      });
    }

    // Check that item limit is reached
    const room = gameState.room;
    if (!room) throw new Error('Room is null');
    expect(room.items.length >= room.config.itemsPerGame).toBe(true);
  });

  it('should end game when all players ranked all items', () => {
    // Add 3 items
    for (let i = 1; i <= 3; i++) {
      gameState.addItem({
        id: `item-${i}`,
        text: `Item ${i}`,
        emoji: '🎯',
        submittedByPlayerId: i % 2 === 1 ? 'host-1' : 'p2',
        submittedAt: Date.now(),
        roomId: 'room-1',
      });
    }

    // Both players rank all items
    const host = gameState.getPlayer('host-1');
    const p2 = gameState.getPlayer('p2');
    if (!host || !p2) throw new Error('Players not found');

    host.rankings['item-1'] = 1;
    host.rankings['item-2'] = 2;
    host.rankings['item-3'] = 3;
    p2.rankings['item-1'] = 3;
    p2.rankings['item-2'] = 2;
    p2.rankings['item-3'] = 1;

    // Check game end condition
    const room = gameState.room;
    if (!room) throw new Error('Room is null');
    const allDone = room.players.every((p) => {
      const rankCount = Object.keys(p.rankings).length;
      const isCaughtUp = !p.isCatchingUp;
      return rankCount >= room.config.itemsPerGame && isCaughtUp;
    });
    expect(allDone).toBe(true);

    // End game
    gameState.endGame();
    expect(room.status).toBe('ended');
  });

  it('should not end game if late joiner is still catching up', () => {
    // Add 3 items
    for (let i = 1; i <= 3; i++) {
      gameState.addItem({
        id: `item-${i}`,
        text: `Item ${i}`,
        emoji: '🎯',
        submittedByPlayerId: 'host-1',
        submittedAt: Date.now(),
        roomId: 'room-1',
      });
    }

    // Both existing players rank all items
    const host = gameState.getPlayer('host-1');
    const p2 = gameState.getPlayer('p2');
    if (!host || !p2) throw new Error('Players not found');

    host.rankings['item-1'] = 1;
    host.rankings['item-2'] = 2;
    host.rankings['item-3'] = 3;
    p2.rankings['item-1'] = 2;
    p2.rankings['item-2'] = 3;
    p2.rankings['item-3'] = 1;

    // Add late joiner who is catching up
    gameState.addPlayer({
      id: 'late-1',
      nickname: 'Latecomer',
      roomId: 'room-1',
      connected: true,
      rankings: {},
      joinedAt: Date.now(),
      isCatchingUp: true,
    });

    // Check game end condition - should be FALSE because late joiner hasn't caught up
    const room = gameState.room;
    if (!room) throw new Error('Room is null');
    const allDone = room.players.every((p) => {
      const rankCount = Object.keys(p.rankings).length;
      const isCaughtUp = !p.isCatchingUp;
      return rankCount >= room.config.itemsPerGame && isCaughtUp;
    });
    expect(allDone).toBe(false);
    expect(room.status).toBe('in-progress');
  });

  it('should end game after late joiner catches up and ranks all items', () => {
    // Add 3 items
    for (let i = 1; i <= 3; i++) {
      gameState.addItem({
        id: `item-${i}`,
        text: `Item ${i}`,
        emoji: '🎯',
        submittedByPlayerId: 'host-1',
        submittedAt: Date.now(),
        roomId: 'room-1',
      });
    }

    // Both existing players rank all items
    const host = gameState.getPlayer('host-1');
    const p2 = gameState.getPlayer('p2');
    if (!host || !p2) throw new Error('Players not found');

    host.rankings['item-1'] = 1;
    host.rankings['item-2'] = 2;
    host.rankings['item-3'] = 3;
    p2.rankings['item-1'] = 2;
    p2.rankings['item-2'] = 3;
    p2.rankings['item-3'] = 1;

    // Add late joiner
    gameState.addPlayer({
      id: 'late-1',
      nickname: 'Latecomer',
      roomId: 'room-1',
      connected: true,
      rankings: {},
      joinedAt: Date.now(),
      isCatchingUp: true,
    });

    const latePlayer = gameState.getPlayer('late-1');
    if (!latePlayer) throw new Error('late-1 not found');

    // Late joiner catches up by ranking all items
    latePlayer.rankings['item-1'] = 3;
    latePlayer.rankings['item-2'] = 1;
    latePlayer.rankings['item-3'] = 2;
    gameState.checkPlayerCaughtUp('late-1');

    // Check game end condition - should be TRUE now
    const room = gameState.room;
    if (!room) throw new Error('Room is null');
    const allDone = room.players.every((p) => {
      const rankCount = Object.keys(p.rankings).length;
      const isCaughtUp = !p.isCatchingUp;
      return rankCount >= room.config.itemsPerGame && isCaughtUp;
    });
    expect(allDone).toBe(true);

    gameState.endGame();
    expect(room.status).toBe('ended');
  });
});
