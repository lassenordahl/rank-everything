import { describe, it, expect } from 'vitest';
import {
  rankToPoints,
  calculateAggregatedRankings,
  getAggregationDetails,
} from './aggregateRankings';

describe('aggregateRankings', () => {
  describe('rankToPoints', () => {
    it('converts rank 1 to 10 points', () => {
      expect(rankToPoints(1)).toBe(10);
    });

    it('converts rank 10 to 1 point', () => {
      expect(rankToPoints(10)).toBe(1);
    });

    it('converts rank 5 to 6 points', () => {
      expect(rankToPoints(5)).toBe(6);
    });

    it('follows formula: 11 - rank', () => {
      for (let rank = 1; rank <= 10; rank++) {
        expect(rankToPoints(rank)).toBe(11 - rank);
      }
    });
  });

  describe('calculateAggregatedRankings', () => {
    const items = [{ id: 'pizza' }, { id: 'burger' }, { id: 'sushi' }];

    it('returns empty object for empty players', () => {
      expect(calculateAggregatedRankings([], items)).toEqual({});
    });

    it('returns empty object for empty items', () => {
      const players = [{ rankings: { pizza: 1, burger: 2, sushi: 3 } }];
      expect(calculateAggregatedRankings(players, [])).toEqual({});
    });

    it('calculates aggregated rankings for single player', () => {
      const players = [{ rankings: { pizza: 1, burger: 2, sushi: 3 } }];

      const result = calculateAggregatedRankings(players, items);

      // Pizza: rank 1 = 10 pts -> aggregate rank 1
      // Burger: rank 2 = 9 pts -> aggregate rank 2
      // Sushi: rank 3 = 8 pts -> aggregate rank 3
      expect(result).toEqual({
        pizza: 1,
        burger: 2,
        sushi: 3,
      });
    });

    it('calculates aggregated rankings for multiple players', () => {
      const players = [
        { rankings: { pizza: 1, burger: 2, sushi: 3 } }, // pizza=10, burger=9, sushi=8
        { rankings: { pizza: 2, burger: 1, sushi: 3 } }, // pizza=9, burger=10, sushi=8
        { rankings: { pizza: 1, burger: 3, sushi: 2 } }, // pizza=10, burger=8, sushi=9
      ];

      const result = calculateAggregatedRankings(players, items);

      // Pizza: 10 + 9 + 10 = 29 pts -> aggregate rank 1
      // Burger: 9 + 10 + 8 = 27 pts -> aggregate rank 2
      // Sushi: 8 + 8 + 9 = 25 pts -> aggregate rank 3
      expect(result).toEqual({
        pizza: 1,
        burger: 2,
        sushi: 3,
      });
    });

    it('handles ties by using average rank as tiebreaker', () => {
      const players = [
        { rankings: { pizza: 1, burger: 3 } }, // pizza=10, burger=8
        { rankings: { pizza: 3, burger: 1 } }, // pizza=8, burger=10
      ];
      const twoItems = [{ id: 'pizza' }, { id: 'burger' }];

      const result = calculateAggregatedRankings(players, twoItems);

      // Pizza: 10 + 8 = 18 pts, avg rank = 2
      // Burger: 8 + 10 = 18 pts, avg rank = 2
      // Same points, same avg -> original order maintained
      expect(result.pizza).toBe(1);
      expect(result.burger).toBe(2);
    });

    it('handles items ranked by only some players', () => {
      const players = [
        { rankings: { pizza: 1, burger: 2 } },
        { rankings: { pizza: 2, sushi: 1 } }, // No burger ranking
      ];

      const result = calculateAggregatedRankings(players, items);

      // Pizza: 10 + 9 = 19 pts
      // Sushi: 0 + 10 = 10 pts (only one player)
      // Burger: 9 + 0 = 9 pts (only one player)
      expect(result.pizza).toBe(1);
      expect(result.sushi).toBe(2);
      expect(result.burger).toBe(3);
    });

    it('handles 10-item games with multiple players', () => {
      const tenItems = Array.from({ length: 10 }, (_, i) => ({ id: `item${i + 1}` }));

      // Player 1: item1 is best, item10 is worst
      const player1Rankings: Record<string, number> = {};
      tenItems.forEach((item, i) => {
        player1Rankings[item.id] = i + 1;
      });

      // Player 2: item10 is best, item1 is worst (reversed)
      const player2Rankings: Record<string, number> = {};
      tenItems.forEach((item, i) => {
        player2Rankings[item.id] = 10 - i;
      });

      const players = [{ rankings: player1Rankings }, { rankings: player2Rankings }];

      const result = calculateAggregatedRankings(players, tenItems);

      // All items should have equal points (rank n + rank 11-n = 11 pts each)
      // With tied points, tiebreaker is average rank
      // item1: avg = (1+10)/2 = 5.5
      // item5,item6: avg = (5+6)/2 = 5.5
      // All should be 1-10 rankings
      expect(Object.values(result).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    it('ranks higher-voted items first with consensus', () => {
      const players = [
        { rankings: { pizza: 1, burger: 10, sushi: 5 } },
        { rankings: { pizza: 1, burger: 10, sushi: 5 } },
        { rankings: { pizza: 1, burger: 10, sushi: 5 } },
      ];

      const result = calculateAggregatedRankings(players, items);

      // All players agree: pizza is best, burger is worst
      expect(result).toEqual({
        pizza: 1,
        sushi: 2,
        burger: 3,
      });
    });
  });

  describe('getAggregationDetails', () => {
    const items = [{ id: 'pizza' }, { id: 'burger' }, { id: 'sushi' }];

    it('returns empty array for empty players', () => {
      expect(getAggregationDetails([], items)).toEqual([]);
    });

    it('returns empty array for empty items', () => {
      const players = [{ rankings: { pizza: 1 } }];
      expect(getAggregationDetails(players, [])).toEqual([]);
    });

    it('returns sorted details with total points and average rank', () => {
      const players = [
        { rankings: { pizza: 1, burger: 2, sushi: 3 } }, // pizza=10, burger=9, sushi=8
        { rankings: { pizza: 2, burger: 1, sushi: 3 } }, // pizza=9, burger=10, sushi=8
      ];

      const result = getAggregationDetails(players, items);

      expect(result).toHaveLength(3);

      // Pizza: 10 + 9 = 19 pts, avg rank = 1.5
      expect(result[0]).toEqual({
        itemId: 'pizza',
        totalPoints: 19,
        averageRank: 1.5,
        playerCount: 2,
      });

      // Burger: 9 + 10 = 19 pts, avg rank = 1.5
      expect(result[1]).toEqual({
        itemId: 'burger',
        totalPoints: 19,
        averageRank: 1.5,
        playerCount: 2,
      });

      // Sushi: 8 + 8 = 16 pts, avg rank = 3
      expect(result[2]).toEqual({
        itemId: 'sushi',
        totalPoints: 16,
        averageRank: 3,
        playerCount: 2,
      });
    });

    it('tracks player count for partial rankings', () => {
      const players = [
        { rankings: { pizza: 1, burger: 2, sushi: 3 } },
        { rankings: { pizza: 2 } }, // Only ranked pizza
      ];

      const result = getAggregationDetails(players, items);

      const pizzaDetails = result.find((r) => r.itemId === 'pizza');
      const burgerDetails = result.find((r) => r.itemId === 'burger');

      expect(pizzaDetails?.playerCount).toBe(2);
      expect(burgerDetails?.playerCount).toBe(1);
    });
  });
});
