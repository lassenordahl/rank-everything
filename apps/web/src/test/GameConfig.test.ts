/**
 * Game Configuration Tests
 *
 * Verifies that room configuration can be updated and affects game behavior.
 */

import { describe, it, expect } from 'vitest';
import { GameSimulator, createGameWithPlayers } from './GameSimulator';

describe('Game Configuration', () => {
  describe('Items Config', () => {
    it('should default to 10 items per game', () => {
      const sim = new GameSimulator();
      // Room config is set in constructor, default should be 10
      expect(sim.getRoom().config.itemsPerGame).toBe(10);
    });

    it('should allow updating items per game via configuration', () => {
      const sim = new GameSimulator();
      sim.configure({ itemsPerGame: 5 });
      expect(sim.getRoom().config.itemsPerGame).toBe(5);

      sim.configure({ itemsPerGame: 3 });
      expect(sim.getRoom().config.itemsPerGame).toBe(3);
    });

    it('should end game after configured number of items (3)', () => {
      const sim = createGameWithPlayers(2);
      sim.configure({ itemsPerGame: 3 });
      sim.startGame();

      const items = ['Item 1', 'Item 2', 'Item 3'];

      for (let i = 0; i < 3; i++) {
        const player = sim.getCurrentTurnPlayer();
        if (!player) break;

        const result = sim.submitItem(player.id, items[i]);
        expect(result.success).toBe(true);

        if (result.itemId) {
          const itemId = result.itemId;
          sim.getRoom().players.forEach((p) => {
            // Use simple ranking logic (1, 2, 3...)
            sim.rankItem(p.id, itemId, i + 1);
          });
        }
      }

      // Should be ended now
      sim.assertStatus('ended');
      sim.assertItemCount(3);
    });

    it('should end game after configured number of items (5)', () => {
      const sim = createGameWithPlayers(2);
      sim.configure({ itemsPerGame: 5 });
      sim.startGame();

      for (let i = 0; i < 5; i++) {
        const player = sim.getCurrentTurnPlayer();
        if (!player) break;

        const result = sim.submitItem(player.id, `Item ${i + 1}`);
        expect(result.success).toBe(true);

        if (result.itemId) {
          const itemId = result.itemId;
          sim.getRoom().players.forEach((p) => {
            sim.rankItem(p.id, itemId, (i % 5) + 1);
          });
        }
      }

      // Should be ended now
      sim.assertStatus('ended');
      sim.assertItemCount(5);
    });
  });
});
