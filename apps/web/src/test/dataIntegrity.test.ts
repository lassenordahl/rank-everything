import { describe, it, expect, beforeEach } from 'vitest';
import { createGameWithPlayers } from './GameSimulator';

describe('Game Data Integrity', () => {
  // No setup needed for Simulator class
  beforeEach(() => {
    // Reset if needed
  });

  it('should allow ranking the 10th item before ending the game', async () => {
    const sim = createGameWithPlayers(2); // 2 players
    sim.startGame();

    const room = sim.getRoom();
    const p1 = room.players[0];
    const p2 = room.players[1];

    // Config: 10 items per game

    // Submit 10 items total
    const itemIds: string[] = [];
    for (let i = 0; i < 10; i++) {
      const player = i % 2 === 0 ? p1 : p2;
      const res = sim.submitItem(player.id, `Item ${i}`);
      if (res.itemId) itemIds.push(res.itemId);
    }

    // CRITICAL ASSERTION:
    // Game should NOT be ended yet. We still need to rank the 10th item!
    // This expects 'in-progress'. If bug exists, it will be 'ended'.
    expect(sim.getRoom().status).toBe('in-progress');

    // Rank 9 items for P1
    for (let i = 0; i < 9; i++) {
      sim.rankItem(p1.id, itemIds[i], i + 1);
    }

    // Rank 10 items for P2
    for (let i = 0; i < 10; i++) {
      sim.rankItem(p2.id, itemIds[i], i + 1);
    }

    // P1 ranks the final 10th item
    sim.rankItem(p1.id, itemIds[9], 10);

    // NOW game should be ended (all items ranked by all players)
    // Note: Simulator logic might need update to auto-end on ranking too.
    // Spec: "Game ends when total items ranked by all players"

    // For now, let's just checking the first assertion failure which confirms the bug.
  });
});
