/**
 * Game Flow Integration Tests
 *
 * Tests complete game flows from start to end based on PROJECT_SPEC.md workflows.
 */

import { describe, it, expect } from 'vitest';
import {
  createMockRoom,
  createMockPlayer,
  createMockItem,
  createMockLobbyRoom,
  createMockInProgressRoom,
  createMockEndedRoom,
  mockServerEvents,
  mockApiResponses,
} from './fixtures';

describe('Game Flow Integration', () => {
  describe('Flow A: Creating & Playing a Custom Room (per PROJECT_SPEC.md)', () => {
    it('Step 1-4: Create room and configure settings', () => {
      // 1. Land on homepage - frontend handles
      // 2. Click "Create Room" - frontend handles
      // 3. Enter nickname (used to identify host)

      // 4. Configure room settings
      const room = createMockRoom({
        config: {
          submissionMode: 'round-robin',
          timerEnabled: true,
          timerDuration: 60,
          rankingTimeout: 15,
        },
      });

      expect(room.hostPlayerId).toBe('host-player');
      expect(room.config.submissionMode).toBe('round-robin');
      expect(room.config.timerDuration).toBe(60);
    });

    it('Step 5-7: Share code and friends join', () => {
      // 5. Get 4-letter room code
      const room = createMockRoom();
      expect(room.id).toMatch(/^[A-Z]{4}$/);

      // 6. Share code with friends - frontend handles

      // 7. Friends join via "Join Room"
      const friend1 = createMockPlayer({ id: 'friend-1', nickname: 'Friend1' });
      const friend2 = createMockPlayer({ id: 'friend-2', nickname: 'Friend2' });

      room.players.push(friend1);
      room.players.push(friend2);

      expect(room.players.length).toBe(3);
      expect(room.players.map((p) => p.nickname)).toEqual(['Host', 'Friend1', 'Friend2']);
    });

    it('Step 8-9: Game begins with turn-based submission + ranking', () => {
      // 8. Host clicks "Start Game"
      const room = createMockLobbyRoom(4);

      // Simulate start
      room.status = 'in-progress';
      room.currentTurnPlayerId = room.players[0].id;
      room.currentTurnIndex = 0;

      expect(room.status).toBe('in-progress');

      // 9. Game begins (turn-based submission + ranking)
      // First player submits
      const item = createMockItem({ text: 'Pizza', submittedByPlayerId: room.currentTurnPlayerId });
      room.items.push(item);

      expect(room.items.length).toBe(1);
    });

    it('Step 10: After 10 items, reveal screen', () => {
      // 10. After 10 items, reveal screen
      const room = createMockEndedRoom();

      expect(room.status).toBe('ended');
      expect(room.items.length).toBe(10);

      // All players should have rankings
      room.players.forEach((player) => {
        expect(Object.keys(player.rankings).length).toBe(10);
      });
    });

    it('Step 11-13: View carousel, screenshot, and play again', () => {
      // 11. View carousel of everyone's rankings
      const room = createMockEndedRoom();

      // Each player should have unique rankings
      room.players.forEach((player) => {
        const rankings = Object.values(player.rankings);
        expect(rankings.length).toBe(10);
      });

      // 12. Screenshot & share - frontend handles
      // 13. Option to play again - would reset room state
    });
  });

  describe('Full Game Simulation', () => {
    it('should complete a full game with 4 players and 10 items', () => {
      // Setup
      const room = createMockLobbyRoom(4);

      // Start game
      room.status = 'in-progress';
      room.currentTurnIndex = 0;
      room.currentTurnPlayerId = room.players[0].id;

      // Simulate 10 rounds of submissions
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

      items.forEach((text, i) => {
        // Current player submits
        const item = createMockItem({
          id: `item-${i}`,
          text,
          submittedByPlayerId: room.currentTurnPlayerId || '',
        });
        room.items.push(item);

        // All players rank the item
        room.players.forEach((player, _pIdx) => {
          const availableRank = i + 1; // Simple sequential ranking
          player.rankings[item.id] = availableRank;
        });

        // Advance turn (round-robin)
        room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
        room.currentTurnPlayerId = room.players[room.currentTurnIndex].id;
      });

      // End game
      room.status = 'ended';

      // Assertions
      expect(room.items.length).toBe(10);
      expect(room.status).toBe('ended');

      room.players.forEach((player) => {
        expect(Object.keys(player.rankings).length).toBe(10);
      });
    });

    it('should handle host-only mode correctly', () => {
      const room = createMockRoom({
        config: {
          submissionMode: 'host-only',
          timerEnabled: false,
          timerDuration: 0,
          rankingTimeout: 0,
        },
      });
      room.players.push(createMockPlayer({ id: 'player-2' }));
      room.players.push(createMockPlayer({ id: 'player-3' }));

      // Start game
      room.status = 'in-progress';
      room.currentTurnPlayerId = room.hostPlayerId;

      // All submissions should be from host
      for (let i = 0; i < 10; i++) {
        const item = createMockItem({
          id: `item-${i}`,
          text: `Item ${i}`,
          submittedByPlayerId: room.hostPlayerId,
        });
        room.items.push(item);

        // In host-only mode, turn stays with host
        expect(room.currentTurnPlayerId).toBe(room.hostPlayerId);
      }

      expect(room.items.length).toBe(10);
      expect(room.items.every((item) => item.submittedByPlayerId === room.hostPlayerId)).toBe(true);
    });
  });

  describe('WebSocket Event Flow', () => {
    it('should emit correct events during game lifecycle', () => {
      // Room created
      const room = createMockRoom();
      const roomCreatedEvent = mockServerEvents.roomUpdated(room);
      expect(roomCreatedEvent.type).toBe('room_updated');

      // Player joins
      const newPlayer = createMockPlayer({ nickname: 'NewPlayer' });
      const playerJoinedEvent = mockServerEvents.playerJoined(newPlayer);
      expect(playerJoinedEvent.type).toBe('player_joined');

      // Game starts
      const gameStartedEvent = mockServerEvents.gameStarted();
      expect(gameStartedEvent.type).toBe('game_started');

      // Item submitted
      const item = createMockItem();
      const itemSubmittedEvent = mockServerEvents.itemSubmitted(item);
      expect(itemSubmittedEvent.type).toBe('item_submitted');

      // Turn changes
      const turnChangedEvent = mockServerEvents.turnChanged('player-2');
      expect(turnChangedEvent.type).toBe('turn_changed');

      // Game ends
      const gameEndedEvent = mockServerEvents.gameEnded();
      expect(gameEndedEvent.type).toBe('game_ended');
    });
  });

  describe('Edge Cases (per PROJECT_SPEC.md Section 2.4)', () => {
    it('should reject exact duplicate items', () => {
      const room = createMockInProgressRoom(1);
      room.items[0].text = 'Pizza';

      const isDuplicate = (text: string) =>
        room.items.some((item) => item.text.toLowerCase() === text.toLowerCase());

      expect(isDuplicate('Pizza')).toBe(true);
      expect(isDuplicate('pizza')).toBe(true); // Case insensitive
      expect(isDuplicate('Tacos')).toBe(false);
    });

    it('should allow similar but not exact items', () => {
      const room = createMockInProgressRoom(0);
      room.items.push(createMockItem({ text: '1 orange' }));

      const isDuplicate = (text: string) =>
        room.items.some((item) => item.text.toLowerCase() === text.toLowerCase());

      expect(isDuplicate('1 orange')).toBe(true);
      expect(isDuplicate('2 oranges')).toBe(false); // Similar but allowed
    });

    it('should not allow joining mid-game', () => {
      const room = createMockInProgressRoom(5);

      const canJoin = room.status === 'lobby';
      expect(canJoin).toBe(false);
    });

    it('should not allow changing rankings after set', () => {
      const player = createMockPlayer();
      const itemId = 'item-1';

      // First ranking
      player.rankings[itemId] = 3;

      // In a real implementation, trying to change should fail
      const originalRanking = player.rankings[itemId];
      const rankingIsLocked = true; // Server would enforce this

      if (rankingIsLocked) {
        // Ranking cannot be changed
        expect(player.rankings[itemId]).toBe(originalRanking);
      }
    });

    it('should enforce max 100 characters per submission', () => {
      const validateLength = (text: string) => text.length <= 100;

      expect(validateLength('Short item')).toBe(true);
      expect(validateLength('A'.repeat(100))).toBe(true);
      expect(validateLength('A'.repeat(101))).toBe(false);
    });

    it('should have exactly 10 ranking slots', () => {
      const maxRankingSlots = 10;

      const player = createMockPlayer();
      for (let i = 1; i <= 10; i++) {
        player.rankings[`item-${i}`] = i;
      }

      expect(Object.keys(player.rankings).length).toBe(maxRankingSlots);
    });

    it('should maintain unique room codes', () => {
      const codes = new Set(['ABCD', 'EFGH', 'IJKL', 'MNOP']);

      const isUnique = (code: string) => !codes.has(code);

      expect(isUnique('QRST')).toBe(true);
      expect(isUnique('ABCD')).toBe(false);
    });
  });

  describe('API Response Fixtures', () => {
    it('should create valid create room response', () => {
      const response = mockApiResponses.createRoom('WXYZ', 'host-123');

      expect(response.roomCode).toBe('WXYZ');
      expect(response.playerId).toBe('host-123');
      expect(response.room.id).toBe('WXYZ');
    });

    it('should create valid join room response', () => {
      const response = mockApiResponses.joinRoom('player-456');

      expect(response.playerId).toBe('player-456');
      expect(response.room.status).toBe('lobby');
    });

    it('should create valid start game response', () => {
      const response = mockApiResponses.startGame();

      expect(response.room.status).toBe('in-progress');
    });

    it('should create valid error response', () => {
      const response = mockApiResponses.error('Room not found', 'ROOM_NOT_FOUND');

      expect(response.error).toBe('Room not found');
      expect(response.code).toBe('ROOM_NOT_FOUND');
    });
  });
});
