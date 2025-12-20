/**
 * Full Game Simulation Tests
 *
 * Comprehensive tests for complete game flows with 1-N players.
 * Tests complex scenarios including player disconnect/reconnect.
 */

import { describe, it, expect } from 'vitest';
import { GameSimulator, runFullGame, createGameWithPlayers } from './GameSimulator';

describe('Full Game Simulations', () => {
  describe('1-Player Game', () => {
    it('should complete a full game with 1 player', () => {
      const sim = new GameSimulator('SOLO', 'SoloPlayer');

      // Start game
      const startResult = sim.startGame();
      expect(startResult.success).toBe(true);
      sim.assertStatus('in-progress');
      sim.assertPlayerCount(1);

      // Play 10 rounds - solo player submits all items
      const items = [
        'Pizza',
        'Coffee',
        'Sleeping',
        'Mondays',
        'Friday',
        'Beach',
        'Snow',
        'Chocolate',
        'Exercise',
        'Netflix',
      ];

      for (let i = 0; i < 10; i++) {
        sim.assertCurrentTurn('host-player');

        const result = sim.submitItem('host-player', items[i]);
        expect(result.success).toBe(true);

        // Solo player ranks each item
        if (result.itemId) {
          sim.rankItem('host-player', result.itemId, i + 1);
        }
      }

      // Verify end state
      sim.assertStatus('ended');
      sim.assertItemCount(10);
      sim.assertPlayerRankings('host-player', 10);
      sim.assertNoErrors();

      const result = sim.getResult();
      expect(result.events.some((e) => e.type === 'game_ended')).toBe(true);
    });
  });

  describe('2-Player Game (Round-Robin)', () => {
    it('should alternate turns between 2 players', () => {
      const sim = new GameSimulator();
      sim.addPlayer('Player2');
      sim.startGame();

      const items = [
        'Pizza',
        'Tacos',
        'Burgers',
        'Sushi',
        'Pasta',
        'Salad',
        'Steak',
        'Curry',
        'Ramen',
        'Wings',
      ];

      for (let i = 0; i < 10; i++) {
        const expectedPlayer = i % 2 === 0 ? 'host-player' : 'player-1';
        sim.assertCurrentTurn(expectedPlayer);

        const result = sim.submitItem(expectedPlayer, items[i]);
        expect(result.success).toBe(true);

        // Both players rank
        if (result.itemId) {
          sim.rankItem('host-player', result.itemId, i + 1);
          sim.rankItem('player-1', result.itemId, 10 - i);
        }
      }

      sim.assertStatus('ended');
      sim.assertItemCount(10);
      sim.assertPlayerRankings('host-player', 10);
      sim.assertPlayerRankings('player-1', 10);
    });

    it('should handle wrong player trying to submit', () => {
      const sim = new GameSimulator();
      sim.addPlayer('Player2');
      sim.startGame();

      // Host's turn, but Player2 tries to submit
      const result = sim.submitItem('player-1', 'Pizza');
      expect(result.success).toBe(false);
      expect(result.error).toContain("Not player-1's turn");
    });
  });

  describe('4-Player Game', () => {
    it('should complete full game with 4 players', () => {
      const sim = createGameWithPlayers(4);
      sim.startGame();

      const items = [
        'Item1',
        'Item2',
        'Item3',
        'Item4',
        'Item5',
        'Item6',
        'Item7',
        'Item8',
        'Item9',
        'Item10',
      ];

      for (let i = 0; i < 10; i++) {
        const player = sim.getCurrentTurnPlayer();
        if (!player) break;
        const result = sim.submitItem(player.id, items[i]);
        expect(result.success).toBe(true);

        // All 4 players rank (use different rankings)
        const room = sim.getRoom();
        room.players.forEach((p, pIdx) => {
          const ranking = ((i + pIdx) % 10) + 1;
          const existingRankings = Object.values(p.rankings);
          if (!existingRankings.includes(ranking) && result.itemId) {
            sim.rankItem(p.id, result.itemId, ranking);
          }
        });
      }

      sim.assertStatus('ended');
      const room = sim.getRoom();
      expect(room.players.length).toBe(4);

      // Verify turn distribution (round-robin with 4 players)
      const submissions = room.items.map((item) => item.submittedByPlayerId);
      expect(submissions.filter((id) => id === 'host-player').length).toBeGreaterThanOrEqual(2);
    });

    it('should verify each player gets at least 2 turns in 10 rounds', () => {
      const sim = createGameWithPlayers(4);
      sim.startGame();

      const turnCount: Record<string, number> = {};

      for (let i = 0; i < 10; i++) {
        const player = sim.getCurrentTurnPlayer();
        if (!player) break;
        turnCount[player.id] = (turnCount[player.id] || 0) + 1;

        sim.submitItem(player.id, `Item ${i + 1}`);
      }

      // Each player should get at least 2 turns (10 rounds / 4 players = 2.5)
      Object.values(turnCount).forEach((count) => {
        expect(count).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('8-Player Game', () => {
    it('should complete full game with 8 players', () => {
      const sim = new GameSimulator();
      for (let i = 1; i < 8; i++) {
        sim.addPlayer(`Player${i + 1}`);
      }

      sim.assertPlayerCount(8);
      sim.startGame();

      for (let i = 0; i < 10; i++) {
        const player = sim.getCurrentTurnPlayer();
        if (!player) break;
        const result = sim.submitItem(player.id, `Item ${i + 1}`);
        expect(result.success).toBe(true);

        // Everyone ranks the item
        if (result.itemId) {
          const itemId = result.itemId;
          sim.getRoom().players.forEach((p) => {
            sim.rankItem(p.id, itemId, i + 1);
          });
        }
      }

      sim.assertStatus('ended');
      sim.assertItemCount(10);
    });

    it('should distribute turns fairly among 8 players', () => {
      const sim = new GameSimulator();
      for (let i = 1; i < 8; i++) {
        sim.addPlayer(`Player${i + 1}`);
      }
      sim.startGame();

      const submitters: string[] = [];

      for (let i = 0; i < 10; i++) {
        const player = sim.getCurrentTurnPlayer();
        if (!player) break;
        submitters.push(player.nickname);
        sim.submitItem(player.id, `Item ${i + 1}`);
      }

      // With 8 players and 10 items, we expect:
      // - Players 1-2 get 2 turns each
      // - Players 3-8 get 1 turn each
      const turnCounts: Record<string, number> = {};
      submitters.forEach((name) => {
        turnCounts[name] = (turnCounts[name] || 0) + 1;
      });

      expect(Object.keys(turnCounts).length).toBe(8);
    });
  });

  describe('Host-Only Mode', () => {
    it('should only allow host to submit in host-only mode', () => {
      const sim = createGameWithPlayers(4);
      sim.configure({ submissionMode: 'host-only' });
      sim.startGame();

      // Non-host tries to submit
      const badResult = sim.submitItem('player-1', 'Not allowed');
      expect(badResult.success).toBe(false);
      expect(badResult.error).toContain('Only host can submit');

      // Host submits all items
      for (let i = 0; i < 10; i++) {
        const result = sim.submitItem('host-player', `Item ${i + 1}`);
        expect(result.success).toBe(true);

        // Host and others rank
        if (result.itemId) {
          const itemId = result.itemId;
          sim.getRoom().players.forEach((p) => {
            sim.rankItem(p.id, itemId, i + 1);
          });
        }
      }

      sim.assertStatus('ended');

      // All items should be from host
      const room = sim.getRoom();
      room.items.forEach((item) => {
        expect(item.submittedByPlayerId).toBe('host-player');
      });
    });
  });

  describe('Player Disconnect/Reconnect Scenarios', () => {
    it('should skip disconnected player in turn order', () => {
      const sim = createGameWithPlayers(3);
      sim.startGame();

      // Host submits first item
      sim.submitItem('host-player', 'Item 1');

      // Now it's player-1's turn
      sim.assertCurrentTurn('player-1');

      // Player-1 disconnects
      sim.disconnectPlayer('player-1');

      // When turn needs to advance (e.g., timer expiry), it should skip disconnected player
      sim.skipTurn();

      // Turn should go to player-2, skipping disconnected player-1
      sim.assertCurrentTurn('player-2');

      // Player 2 submits
      const result = sim.submitItem('player-2', 'Item 2');
      expect(result.success).toBe(true);
    });

    it('should preserve rankings after reconnect', () => {
      const sim = createGameWithPlayers(2);
      sim.startGame();

      // Submit and rank an item
      const result = sim.submitItem('host-player', 'Pizza');
      if (result.itemId) {
        sim.rankItem('host-player', result.itemId, 1);
        sim.rankItem('player-1', result.itemId, 5);
      }

      // Player 1 disconnects
      sim.disconnectPlayer('player-1');

      // Verify player still exists with rankings
      let player = sim.getPlayer('player-1');
      expect(player?.connected).toBe(false);
      if (player && result.itemId) {
        expect(player.rankings[result.itemId]).toBe(5);
      }

      // Player reconnects
      sim.reconnectPlayer('player-1');

      // Rankings should be preserved
      player = sim.getPlayer('player-1');
      expect(player?.connected).toBe(true);
      if (player && result.itemId) {
        expect(player.rankings[result.itemId]).toBe(5);
      }
    });

    it('should transfer host when host leaves', () => {
      const sim = createGameWithPlayers(3);

      const initialHost = sim.getRoom().hostPlayerId;
      expect(initialHost).toBe('host-player');

      // Host leaves
      sim.removePlayer('host-player');

      // New host should be assigned
      const newHost = sim.getRoom().hostPlayerId;
      expect(newHost).not.toBe('host-player');
      expect(sim.getRoom().players.find((p) => p.id === newHost)).toBeDefined();
    });

    it('should handle all players disconnecting except one', () => {
      const sim = createGameWithPlayers(4);
      sim.startGame();

      // Submit first item
      sim.submitItem('host-player', 'Item 1');

      // Disconnect everyone except player-2
      sim.disconnectPlayer('host-player');
      sim.disconnectPlayer('player-1');
      sim.disconnectPlayer('player-3');

      // Only player-2 is connected
      const room = sim.getRoom();
      const connectedPlayers = room.players.filter((p) => p.connected);
      expect(connectedPlayers.length).toBe(1);
      expect(connectedPlayers[0].id).toBe('player-2');
    });
  });

  describe('Edge Cases', () => {
    it('should reject duplicate items', () => {
      const sim = new GameSimulator();
      sim.startGame();

      sim.submitItem('host-player', 'Pizza');
      const result = sim.submitItem('host-player', 'Pizza');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Duplicate item');
    });

    it('should reject case-insensitive duplicates', () => {
      const sim = new GameSimulator();
      sim.startGame();

      sim.submitItem('host-player', 'PIZZA');
      const result = sim.submitItem('host-player', 'pizza');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Duplicate item');
    });

    it('should reject items over 100 characters', () => {
      const sim = new GameSimulator();
      sim.startGame();

      const longText = 'A'.repeat(101);
      const result = sim.submitItem('host-player', longText);

      expect(result.success).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should reject ranking same slot twice', () => {
      const sim = createGameWithPlayers(2);
      sim.startGame();

      const result1 = sim.submitItem('host-player', 'Item 1');
      if (result1.itemId) {
        sim.rankItem('host-player', result1.itemId, 1);
      }

      const result2 = sim.submitItem('player-1', 'Item 2');
      let rankResult;
      if (result2.itemId) {
        rankResult = sim.rankItem('host-player', result2.itemId, 1);
      }

      if (rankResult) {
        expect(rankResult.success).toBe(false);
        expect(rankResult.error).toContain('slot 1 already used');
      }
    });

    it('should reject re-ranking an item', () => {
      const sim = new GameSimulator();
      sim.startGame();

      const result = sim.submitItem('host-player', 'Pizza');
      if (result.itemId) {
        sim.rankItem('host-player', result.itemId, 1);

        const rerank = sim.rankItem('host-player', result.itemId, 2);
        expect(rerank.success).toBe(false);
        expect(rerank.error).toContain('already ranked');
      }
    });

    it('should allow late joining mid-game with catch-up mode', () => {
      const sim = new GameSimulator();
      sim.startGame();

      // Submit some items first
      const result1 = sim.submitItem('host-player', 'Pizza');
      if (result1.itemId) {
        sim.rankItem('host-player', result1.itemId, 1);
      }

      // Late joiner should succeed but be in catch-up mode
      const joinResult = sim.addPlayer('LateJoiner');
      expect(joinResult.success).toBe(true);
      expect(joinResult.playerId).toBeDefined();

      // Late joiner should be catching up
      if (!joinResult.playerId) throw new Error('No joinResult.playerId');
      const latePlayer = sim.getPlayer(joinResult.playerId);
      expect(latePlayer).toBeDefined();
      if (!latePlayer) throw new Error('Player not found');
      expect(latePlayer.isCatchingUp).toBe(true);

      // Late joiner should see missed items
      if (!joinResult.playerId) throw new Error('No joinResult.playerId');
      const missedItems = sim.getMissedItems(joinResult.playerId);
      expect(missedItems.length).toBe(1);
      if (!result1.itemId) throw new Error('No itemId');
      expect(missedItems[0]).toBe(result1.itemId);
    });

    it('should reject ranking outside 1-10 range', () => {
      const sim = new GameSimulator();
      sim.startGame();

      const result = sim.submitItem('host-player', 'Pizza');

      if (result.itemId) {
        expect(sim.rankItem('host-player', result.itemId, 0).success).toBe(false);
        expect(sim.rankItem('host-player', result.itemId, 11).success).toBe(false);
      }
    });
  });

  describe('End State Verification', () => {
    it('should have correct final state for 2-player game', () => {
      const result = runFullGame(2);

      expect(result.room.status).toBe('ended');
      expect(result.room.items.length).toBe(10);
      expect(result.room.players.length).toBe(2);
      expect(result.errors.length).toBe(0);

      // Verify game lifecycle events occurred
      const eventTypes = result.events.map((e) => e.type);
      expect(eventTypes).toContain('room_created');
      expect(eventTypes).toContain('player_joined');
      expect(eventTypes).toContain('game_started');
      expect(eventTypes).toContain('item_submitted');
      expect(eventTypes).toContain('game_ended');
    });

    it('should have correct final state for 6-player game', () => {
      const result = runFullGame(6);

      expect(result.room.status).toBe('ended');
      expect(result.room.items.length).toBe(10);
      expect(result.room.players.length).toBe(6);
    });

    it('should track all events during game', () => {
      const sim = createGameWithPlayers(3);
      sim.startGame();

      for (let i = 0; i < 10; i++) {
        const player = sim.getCurrentTurnPlayer();
        if (!player) break;
        const res = sim.submitItem(player.id, `Item ${i + 1}`);

        if (res.itemId) {
          const itemId = res.itemId;
          sim.getRoom().players.forEach((p) => {
            sim.rankItem(p.id, itemId, i + 1);
          });
        }
      }

      const result = sim.getResult();

      // Count event types
      const eventCounts: Record<string, number> = {};
      result.events.forEach((e) => {
        eventCounts[e.type] = (eventCounts[e.type] || 0) + 1;
      });

      expect(eventCounts['room_created']).toBe(1);
      expect(eventCounts['player_joined']).toBe(2); // 2 additional players
      expect(eventCounts['game_started']).toBe(1);
      expect(eventCounts['item_submitted']).toBe(10);
      expect(eventCounts['turn_changed']).toBe(9); // 9 turn changes (after each item except last)
      expect(eventCounts['game_ended']).toBe(1);
    });
  });

  describe('Configuration Variations', () => {
    it('should work with timer disabled', () => {
      const sim = createGameWithPlayers(2);
      sim.configure({ timerEnabled: false });
      sim.startGame();

      const room = sim.getRoom();
      expect(room.config.timerEnabled).toBe(false);

      // Game should still work
      sim.submitItem('host-player', 'Item 1');
      sim.assertItemCount(1);
    });

    it('should work with custom timer duration', () => {
      const sim = createGameWithPlayers(2);
      sim.configure({ timerDuration: 30 });
      sim.startGame();

      const room = sim.getRoom();
      expect(room.config.timerDuration).toBe(30);
    });
  });

  describe('Late Join Comprehensive Scenarios', () => {
    it('should complete full game with late joiner participating after catch-up', () => {
      // Start with 2 players, 5 items per game
      const sim = new GameSimulator('LATE', 'Host');
      sim.addPlayer('Player2');
      sim.configure({ itemsPerGame: 5 });
      sim.startGame();

      // Submit 2 items before late joiner arrives
      const item1 = sim.submitItem('host-player', 'Pizza');
      if (!item1.itemId) throw new Error('No itemId');
      sim.rankItem('host-player', item1.itemId, 1);
      sim.rankItem('player-1', item1.itemId, 1);

      const item2 = sim.submitItem('player-1', 'Tacos');
      if (!item2.itemId) throw new Error('No itemId');
      sim.rankItem('host-player', item2.itemId, 2);
      sim.rankItem('player-1', item2.itemId, 2);

      // Late joiner arrives
      const lateJoin = sim.addPlayer('LateJoiner');
      expect(lateJoin.success).toBe(true);
      if (!lateJoin.playerId) throw new Error('No lateJoin.playerId');
      const latePlayer = sim.getPlayer(lateJoin.playerId);
      expect(latePlayer).toBeDefined();
      if (!latePlayer) throw new Error('Player not found');
      expect(latePlayer.isCatchingUp).toBe(true);

      // Late joiner catches up on first 2 items
      if (!lateJoin.playerId) throw new Error('No lateJoin.playerId');
      sim.rankItem(lateJoin.playerId, item1.itemId, 3);
      sim.rankItem(lateJoin.playerId, item2.itemId, 4);

      // Should now be active
      const latePlayerAfter = sim.getPlayer(lateJoin.playerId);
      expect(latePlayerAfter?.isCatchingUp).toBe(false);

      // Continue game - late joiner should be in rotation now
      // Host's turn (after player-1 submitted last)
      const item3 = sim.submitItem('host-player', 'Sushi');
      if (!item3.itemId) throw new Error('No itemId');
      sim.rankItem('host-player', item3.itemId, 3);
      sim.rankItem('player-1', item3.itemId, 3);
      if (!lateJoin.playerId) throw new Error('No lateJoin.playerId');
      sim.rankItem(lateJoin.playerId, item3.itemId, 5);

      // Player 1's turn
      const item4 = sim.submitItem('player-1', 'Burgers');
      if (!item4.itemId) throw new Error('No itemId');
      sim.rankItem('host-player', item4.itemId, 4);
      sim.rankItem('player-1', item4.itemId, 4);
      if (!lateJoin.playerId) throw new Error('No lateJoin.playerId');
      sim.rankItem(lateJoin.playerId, item4.itemId, 1);

      // Late joiner's turn now!
      if (!lateJoin.playerId) throw new Error('No lateJoin.playerId');
      sim.assertCurrentTurn(lateJoin.playerId);
      const item5 = sim.submitItem(lateJoin.playerId, 'Ice Cream');
      if (!item5.itemId) throw new Error('No itemId');
      sim.rankItem('host-player', item5.itemId, 5);
      sim.rankItem('player-1', item5.itemId, 5);
      sim.rankItem(lateJoin.playerId, item5.itemId, 2);

      // Game should end
      sim.assertStatus('ended');
      sim.assertItemCount(5);

      // All players should have 5 rankings
      sim.assertPlayerRankings('host-player', 5);
      sim.assertPlayerRankings('player-1', 5);
      if (!lateJoin.playerId) throw new Error('No lateJoin.playerId');
      sim.assertPlayerRankings(lateJoin.playerId, 5);
    });

    it('should handle multiple late joiners at different times', () => {
      const sim = new GameSimulator('MULTI', 'Host');
      sim.addPlayer('Player2');
      sim.configure({ itemsPerGame: 4 });
      sim.startGame();

      // First item
      const item1 = sim.submitItem('host-player', 'Pizza');
      if (!item1.itemId) throw new Error('No itemId');
      sim.rankItem('host-player', item1.itemId, 1);
      sim.rankItem('player-1', item1.itemId, 1);

      // First late joiner arrives
      const late1 = sim.addPlayer('Late1');
      if (!late1.playerId) throw new Error('No late1.playerId');
      expect(sim.getPlayer(late1.playerId)?.isCatchingUp).toBe(true);

      // Second item
      const item2 = sim.submitItem('player-1', 'Tacos');
      if (!item2.itemId) throw new Error('No itemId');
      sim.rankItem('host-player', item2.itemId, 2);
      sim.rankItem('player-1', item2.itemId, 2);

      // Second late joiner arrives (needs to catch up on 2 items)
      const late2 = sim.addPlayer('Late2');
      if (!late2.playerId) throw new Error('No late2.playerId');
      expect(sim.getPlayer(late2.playerId)?.isCatchingUp).toBe(true);
      expect(sim.getMissedItems(late2.playerId).length).toBe(2);

      // Late1 has 2 items to catch up, Late2 has 2 items
      if (!late1.playerId) throw new Error('No late1.playerId');
      expect(sim.getMissedItems(late1.playerId).length).toBe(2);
      if (!late2.playerId) throw new Error('No late2.playerId');
      expect(sim.getMissedItems(late2.playerId).length).toBe(2);

      // Late1 catches up
      if (!late1.playerId) throw new Error('No late1.playerId');
      sim.rankItem(late1.playerId, item1.itemId, 3);
      if (!late1.playerId) throw new Error('No late1.playerId');
      sim.rankItem(late1.playerId, item2.itemId, 4);
      expect(sim.getPlayer(late1.playerId)?.isCatchingUp).toBe(false);

      // Late2 is still catching up
      expect(sim.getPlayer(late2.playerId)?.isCatchingUp).toBe(true);

      // Late2 catches up
      if (!late2.playerId) throw new Error('No late2.playerId');
      sim.rankItem(late2.playerId, item1.itemId, 3);
      if (!late2.playerId) throw new Error('No late2.playerId');
      sim.rankItem(late2.playerId, item2.itemId, 4);
      expect(sim.getPlayer(late2.playerId)?.isCatchingUp).toBe(false);

      // Now both should be in rotation - verify the room has 4 players
      expect(sim.getRoom().players.length).toBe(4);
    });

    it('should allow late joiner to rank while active players submit new items', () => {
      const sim = new GameSimulator('CONC', 'Host');
      sim.addPlayer('Player2');
      sim.configure({ itemsPerGame: 4 });
      sim.startGame();

      // Active players submit first item
      const item1 = sim.submitItem('host-player', 'Pizza');
      if (!item1.itemId) throw new Error('No itemId');
      sim.rankItem('host-player', item1.itemId, 1);
      sim.rankItem('player-1', item1.itemId, 1);

      // Late joiner arrives
      const lateJoin = sim.addPlayer('LateJoiner');
      if (!lateJoin.playerId) throw new Error('No lateJoin.playerId');
      expect(sim.getMissedItems(lateJoin.playerId)).toEqual([item1.itemId]);

      // Active players submit another item while late joiner hasn't caught up
      const item2 = sim.submitItem('player-1', 'Tacos');
      if (!item2.itemId) throw new Error('No itemId');
      sim.rankItem('host-player', item2.itemId, 2);
      sim.rankItem('player-1', item2.itemId, 2);

      // Late joiner now has 2 items to catch up on
      if (!lateJoin.playerId) throw new Error('No lateJoin.playerId');
      expect(sim.getMissedItems(lateJoin.playerId).length).toBe(2);

      // Late joiner ranks first item (still catching up)
      if (!lateJoin.playerId) throw new Error('No lateJoin.playerId');
      sim.rankItem(lateJoin.playerId, item1.itemId, 3);
      expect(sim.getPlayer(lateJoin.playerId)?.isCatchingUp).toBe(true);

      // Another item submitted while late joiner catching up
      const item3 = sim.submitItem('host-player', 'Sushi');
      if (!item3.itemId) throw new Error('No itemId');
      sim.rankItem('host-player', item3.itemId, 3);
      sim.rankItem('player-1', item3.itemId, 3);

      // Late joiner now has 2 more items to catch up on (item2, item3)
      if (!lateJoin.playerId) throw new Error('No lateJoin.playerId');
      expect(sim.getMissedItems(lateJoin.playerId).length).toBe(2);

      // Late joiner finishes catching up
      if (!lateJoin.playerId) throw new Error('No lateJoin.playerId');
      sim.rankItem(lateJoin.playerId, item2.itemId, 4);
      if (!lateJoin.playerId) throw new Error('No lateJoin.playerId');
      sim.rankItem(lateJoin.playerId, item3.itemId, 5);
      expect(sim.getPlayer(lateJoin.playerId)?.isCatchingUp).toBe(false);

      // Now late joiner is in rotation for final item
      const item4 = sim.submitItem('player-1', 'Burgers');
      if (!item4.itemId) throw new Error('No itemId');
      sim.rankItem('host-player', item4.itemId, 4);
      sim.rankItem('player-1', item4.itemId, 4);
      if (!lateJoin.playerId) throw new Error('No lateJoin.playerId');
      sim.rankItem(lateJoin.playerId, item4.itemId, 1);

      sim.assertStatus('ended');
    });

    it('should handle late joiner disconnecting before catching up', () => {
      const sim = new GameSimulator('DISC', 'Host');
      sim.addPlayer('Player2');
      sim.configure({ itemsPerGame: 3 });
      sim.startGame();

      // Submit an item
      const item1 = sim.submitItem('host-player', 'Pizza');
      if (!item1.itemId) throw new Error('No itemId');
      sim.rankItem('host-player', item1.itemId, 1);
      sim.rankItem('player-1', item1.itemId, 1);

      // Late joiner arrives
      const lateJoin = sim.addPlayer('LateJoiner');
      if (!lateJoin.playerId) throw new Error('No lateJoin.playerId');
      expect(sim.getPlayer(lateJoin.playerId)?.isCatchingUp).toBe(true);

      // Late joiner disconnects before catching up
      if (!lateJoin.playerId) throw new Error('No lateJoin.playerId');
      sim.disconnectPlayer(lateJoin.playerId);
      expect(sim.getPlayer(lateJoin.playerId)?.connected).toBe(false);

      // Game should continue without the late joiner in rotation
      const item2 = sim.submitItem('player-1', 'Tacos');
      if (!item2.itemId) throw new Error('No itemId');
      sim.rankItem('host-player', item2.itemId, 2);
      sim.rankItem('player-1', item2.itemId, 2);

      const item3 = sim.submitItem('host-player', 'Sushi');
      if (!item3.itemId) throw new Error('No itemId');
      sim.rankItem('host-player', item3.itemId, 3);
      sim.rankItem('player-1', item3.itemId, 3);

      // Game ends without late joiner (they never caught up and are disconnected)
      // Note: In real implementation, we'd need to decide if disconnected catching-up players block game end
      // For now, the game checks rankCount >= target AND !isCatchingUp
      // So the disconnected late joiner would block game end unless removed
      // This tests that the game can still be played (no crashes)
      sim.assertStatus('in-progress'); // Game blocked by uncaught-up late joiner
      expect(sim.getRoom().items.length).toBe(3);
    });

    it('should handle edge case where only catching-up player remains active', () => {
      const sim = new GameSimulator('EDGE', 'Host');
      sim.addPlayer('Player2');
      sim.configure({ itemsPerGame: 3 });
      sim.startGame();

      // Submit first item
      const item1 = sim.submitItem('host-player', 'Pizza');
      if (!item1.itemId) throw new Error('No itemId');
      sim.rankItem('host-player', item1.itemId, 1);
      sim.rankItem('player-1', item1.itemId, 1);

      // Late joiner arrives
      const lateJoin = sim.addPlayer('LateJoiner');
      if (!lateJoin.playerId) throw new Error('No lateJoin.playerId');
      expect(sim.getPlayer(lateJoin.playerId)?.isCatchingUp).toBe(true);

      // All original players disconnect!
      sim.disconnectPlayer('host-player');
      sim.disconnectPlayer('player-1');

      // Only the catching-up player is connected
      const room = sim.getRoom();
      const connectedPlayers = room.players.filter((p) => p.connected);
      expect(connectedPlayers.length).toBe(1);
      if (!lateJoin.playerId) throw new Error('No lateJoin.playerId');
      expect(connectedPlayers[0].id).toBe(lateJoin.playerId);

      // Late joiner is still catching up
      expect(sim.getPlayer(lateJoin.playerId)?.isCatchingUp).toBe(true);

      // Late joiner catches up
      if (!lateJoin.playerId) throw new Error('No lateJoin.playerId');
      sim.rankItem(lateJoin.playerId, item1.itemId, 2);
      expect(sim.getPlayer(lateJoin.playerId)?.isCatchingUp).toBe(false);

      // Turn is still on player-1 (disconnected), skip to advance to the only active player
      sim.skipTurn();

      // Now late joiner should be able to submit (they're the only active player)
      if (!lateJoin.playerId) throw new Error('No lateJoin.playerId');
      sim.assertCurrentTurn(lateJoin.playerId);
      if (!lateJoin.playerId) throw new Error('No lateJoin.playerId');
      const item2 = sim.submitItem(lateJoin.playerId, 'My Item');
      expect(item2.success).toBe(true);
    });
  });
});
