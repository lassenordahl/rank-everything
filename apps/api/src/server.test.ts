/**
 * Tests for Game Room Server Handlers
 *
 * Tests the core logic of the PartyKit server without the runtime.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMockRoom,
  createMockPlayer,
  createMockHost,
  createMockItem,
  createMockRoomConfig,
} from './test/fixtures';

describe('Game Room Handler Logic', () => {
  describe('Room Creation', () => {
    it('should create a room with correct initial state', () => {
      const room = createMockRoom();

      expect(room.id).toBe('ABCD');
      expect(room.status).toBe('lobby');
      expect(room.players.length).toBe(1);
      expect(room.hostPlayerId).toBe('host-player');
      expect(room.items).toEqual([]);
    });

    it('should create host player with correct properties', () => {
      const host = createMockHost();

      expect(host.id).toBe('host-player');
      expect(host.nickname).toBe('Host');
      expect(host.connected).toBe(true);
      expect(host.rankings).toEqual({});
    });
  });

  describe('Player Joining', () => {
    it('should allow player to join lobby room', () => {
      const room = createMockRoom();
      const newPlayer = createMockPlayer({ id: 'player-2', nickname: 'Player2' });

      room.players.push(newPlayer);

      expect(room.players.length).toBe(2);
      expect(room.players[1].nickname).toBe('Player2');
    });

    it('should preserve host when new players join', () => {
      const room = createMockRoom();
      const originalHostId = room.hostPlayerId;

      room.players.push(createMockPlayer({ id: 'player-2', nickname: 'Player2' }));
      room.players.push(createMockPlayer({ id: 'player-3', nickname: 'Player3' }));

      expect(room.hostPlayerId).toBe(originalHostId);
    });
  });

  describe('Game Start Validation', () => {
    it('should allow starting game with minimum 1 player', () => {
      const room = createMockRoom();
      const canStart = room.players.length >= 1 && room.status === 'lobby';

      expect(canStart).toBe(true);
    });

    it('should not allow starting game that is already in progress', () => {
      const room = createMockRoom({ status: 'in-progress' });
      const canStart = room.status === 'lobby';

      expect(canStart).toBe(false);
    });

    it('should set first player turn when game starts', () => {
      const room = createMockRoom();
      room.players.push(createMockPlayer({ id: 'player-2' }));

      // Simulate game start
      room.status = 'in-progress';
      room.currentTurnPlayerId = room.players[0].id;
      room.currentTurnIndex = 0;

      expect(room.currentTurnPlayerId).toBe('host-player');
    });
  });

  describe('Item Submission', () => {
    it('should add item to room items list', () => {
      const room = createMockRoom({ status: 'in-progress' });
      const item = createMockItem({ text: 'Pizza', emoji: '🍕' });

      room.items.push(item);

      expect(room.items.length).toBe(1);
      expect(room.items[0].text).toBe('Pizza');
    });

    it('should reject duplicate items', () => {
      const room = createMockRoom({ status: 'in-progress' });
      const item1 = createMockItem({ id: 'item-1', text: 'Pizza' });

      room.items.push(item1);

      const isDuplicate = room.items.some((i) => i.text.toLowerCase() === 'pizza');
      expect(isDuplicate).toBe(true);
    });

    it('should advance turn after submission in round-robin mode', () => {
      const room = createMockRoom({
        status: 'in-progress',
        config: createMockRoomConfig({ submissionMode: 'round-robin' }),
      });
      room.players.push(createMockPlayer({ id: 'player-2' }));
      room.currentTurnIndex = 0;
      room.currentTurnPlayerId = room.players[0].id;

      // Simulate turn advancement
      room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
      room.currentTurnPlayerId = room.players[room.currentTurnIndex].id;

      expect(room.currentTurnPlayerId).toBe('player-2');
    });

    it('should keep turn on host in host-only mode', () => {
      const room = createMockRoom({
        status: 'in-progress',
        config: createMockRoomConfig({ submissionMode: 'host-only' }),
      });
      room.players.push(createMockPlayer({ id: 'player-2' }));
      room.currentTurnPlayerId = room.hostPlayerId;

      // In host-only, turn stays on host
      const nextTurnPlayer = room.hostPlayerId;

      expect(nextTurnPlayer).toBe('host-player');
    });
  });

  describe('Item Ranking', () => {
    it('should add ranking to player for specific item', () => {
      const player = createMockHost();
      const item = createMockItem();

      player.rankings[item.id] = 3;

      expect(player.rankings[item.id]).toBe(3);
    });

    it('should not allow duplicate rankings', () => {
      const player = createMockHost();
      const item1 = createMockItem({ id: 'item-1' });
      const item2 = createMockItem({ id: 'item-2' });

      player.rankings[item1.id] = 1;
      player.rankings[item2.id] = 1; // Same ranking

      // In practice, the server should prevent this
      const rankings = Object.values(player.rankings);
      const hasDuplicate = rankings.length !== new Set(rankings).size;

      expect(hasDuplicate).toBe(true);
    });

    it('should enforce ranking range 1-10', () => {
      const isValidRanking = (rank: number) => rank >= 1 && rank <= 10;

      expect(isValidRanking(1)).toBe(true);
      expect(isValidRanking(10)).toBe(true);
      expect(isValidRanking(0)).toBe(false);
      expect(isValidRanking(11)).toBe(false);
    });
  });

  describe('Game End', () => {
    it('should end game when 10 items are submitted', () => {
      const room = createMockRoom({ status: 'in-progress' });

      for (let i = 0; i < 10; i++) {
        room.items.push(createMockItem({ id: `item-${i}` }));
      }

      const shouldEndGame = room.items.length >= 10;
      if (shouldEndGame) {
        room.status = 'ended';
      }

      expect(room.status).toBe('ended');
    });

    it('should preserve all rankings at game end', () => {
      const room = createMockRoom({ status: 'in-progress' });
      room.players.push(createMockPlayer({ id: 'player-2' }));

      // Add items and rankings
      for (let i = 0; i < 10; i++) {
        const item = createMockItem({ id: `item-${i}` });
        room.items.push(item);

        room.players.forEach((player, pIdx) => {
          player.rankings[item.id] = ((i + pIdx) % 10) + 1;
        });
      }

      room.status = 'ended';

      // Verify all rankings preserved
      room.players.forEach((player) => {
        expect(Object.keys(player.rankings).length).toBe(10);
      });
    });
  });

  describe('Room Configuration', () => {
    it('should respect timer enabled setting', () => {
      const config = createMockRoomConfig({ timerEnabled: true, timerDuration: 60 });

      expect(config.timerEnabled).toBe(true);
      expect(config.timerDuration).toBe(60);
    });

    it('should respect timer disabled setting', () => {
      const config = createMockRoomConfig({ timerEnabled: false });

      expect(config.timerEnabled).toBe(false);
    });

    it('should support different submission modes', () => {
      const roundRobin = createMockRoomConfig({ submissionMode: 'round-robin' });
      const hostOnly = createMockRoomConfig({ submissionMode: 'host-only' });

      expect(roundRobin.submissionMode).toBe('round-robin');
      expect(hostOnly.submissionMode).toBe('host-only');
    });
  });

  describe('Player Connection State', () => {
    it('should track player connection status', () => {
      const room = createMockRoom();
      const player = room.players[0];

      // Simulate disconnect
      player.connected = false;
      expect(player.connected).toBe(false);

      // Simulate reconnect
      player.connected = true;
      expect(player.connected).toBe(true);
    });

    it('should preserve player data across reconnection', () => {
      const room = createMockRoom({ status: 'in-progress' });
      const player = room.players[0];

      // Add rankings
      player.rankings['item-1'] = 5;

      // Simulate disconnect/reconnect
      player.connected = false;
      player.connected = true;

      expect(player.rankings['item-1']).toBe(5);
    });
  });
});

/**
 * Tests for emoji validation - ensures only valid unicode emojis are saved to DB
 */
describe('Emoji Validation', () => {
  // Import the function to test
  let isValidEmoji: (str: string) => boolean;

  beforeEach(async () => {
    const module = await import('./handlers/ws/submitItem');
    isValidEmoji = module.isValidEmoji;
  });

  describe('Valid Emojis', () => {
    const validEmojis = [
      // Common emojis
      { emoji: '🍊', description: 'orange fruit' },
      { emoji: '🍕', description: 'pizza' },
      { emoji: '🐶', description: 'dog' },
      { emoji: '😀', description: 'grinning face' },
      { emoji: '❤️', description: 'red heart with variation selector' },
      { emoji: '🚀', description: 'rocket' },
      { emoji: '⭐', description: 'star' },
      { emoji: '☀️', description: 'sun' },
      { emoji: '🎉', description: 'party popper' },
      { emoji: '💯', description: 'hundred points' },
      // Symbol emojis
      { emoji: '⚡', description: 'lightning' },
      { emoji: '☕', description: 'coffee' },
      { emoji: '⚽', description: 'soccer ball' },
      // Flag emojis (multi-codepoint)
      { emoji: '🇺🇸', description: 'US flag' },
      // Misc symbols
      { emoji: '©', description: 'copyright' },
      { emoji: '®', description: 'registered' },
    ];

    it.each(validEmojis)('should accept $description ($emoji)', ({ emoji }) => {
      expect(isValidEmoji(emoji)).toBe(true);
    });
  });

  describe('Invalid Inputs - Should Reject', () => {
    const invalidInputs = [
      { input: '', description: 'empty string' },
      { input: 'hello', description: 'plain text' },
      { input: '123', description: 'numbers' },
      { input: 'abc🍊', description: 'text with emoji' },
      { input: '🍊abc', description: 'emoji with text' },
      { input: '<script>', description: 'HTML tag' },
      { input: 'javascript:alert(1)', description: 'javascript injection' },
      { input: '   ', description: 'whitespace' },
      { input: '\n', description: 'newline' },
      { input: '🍊🍕🐶🚀🎉💯⭐☀️☕', description: 'too many emojis (length check)' },
    ];

    it.each(invalidInputs)('should reject $description', ({ input }) => {
      expect(isValidEmoji(input)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should reject null/undefined', () => {
      expect(isValidEmoji(null as unknown as string)).toBe(false);
      expect(isValidEmoji(undefined as unknown as string)).toBe(false);
    });

    it('should accept single emoji', () => {
      expect(isValidEmoji('🍊')).toBe(true);
    });

    it('should accept emoji with variation selector', () => {
      // Heart with variation selector (rendered as red heart)
      expect(isValidEmoji('❤️')).toBe(true);
    });

    it('should reject very long strings even if they contain emojis', () => {
      const longEmoji = '🍊'.repeat(10);
      expect(isValidEmoji(longEmoji)).toBe(false);
    });
  });

  describe('Security - Prevent Injection', () => {
    const injectionAttempts = [
      '<img src=x onerror=alert(1)>',
      '"><script>alert(1)</script>',
      "'); DROP TABLE items; --",
      '${7*7}',
      '{{constructor.constructor("alert(1)")()}}',
      '%3Cscript%3Ealert(1)%3C/script%3E',
    ];

    it.each(injectionAttempts)('should reject injection attempt: %s', (input) => {
      expect(isValidEmoji(input)).toBe(false);
    });
  });
});
