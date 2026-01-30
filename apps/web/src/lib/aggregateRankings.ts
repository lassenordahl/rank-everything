/**
 * Aggregate Rankings Utility
 *
 * Calculates aggregate rankings from all players using a points system.
 * Points: Rank 1 = 10 points, Rank 2 = 9 points, ..., Rank 10 = 1 point
 * Higher total points = better aggregate rank
 */

import type { Player, Item } from '@rank-everything/shared-types';

export interface AggregatedItem {
  itemId: string;
  totalPoints: number;
  averageRank: number;
  playerCount: number;
}

/**
 * Calculate points for a given rank (1-10).
 * Rank 1 = 10 points, Rank 10 = 1 point
 */
export function rankToPoints(rank: number): number {
  return 11 - rank;
}

/**
 * Calculate aggregated rankings from all players.
 * Returns a Record<string, number> where key is itemId and value is the aggregate rank (1-10).
 *
 * @param players - Array of players with their rankings
 * @param items - Array of items that were ranked
 * @returns Record mapping itemId to aggregate rank (1 = best, 10 = worst)
 */
export function calculateAggregatedRankings(
  players: Pick<Player, 'rankings'>[],
  items: Pick<Item, 'id'>[]
): Record<string, number> {
  if (players.length === 0 || items.length === 0) {
    return {};
  }

  // Calculate total points for each item
  const itemPoints: Map<string, AggregatedItem> = new Map();

  for (const item of items) {
    let totalPoints = 0;
    let playerCount = 0;
    let totalRank = 0;

    for (const player of players) {
      const rank = player.rankings[item.id];
      if (rank !== undefined) {
        totalPoints += rankToPoints(rank);
        totalRank += rank;
        playerCount++;
      }
    }

    if (playerCount > 0) {
      itemPoints.set(item.id, {
        itemId: item.id,
        totalPoints,
        averageRank: totalRank / playerCount,
        playerCount,
      });
    }
  }

  // Sort items by total points (descending - higher points = better rank)
  const sortedItems = Array.from(itemPoints.values()).sort((a, b) => {
    // Primary sort: total points (descending)
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    // Tiebreaker: average rank (ascending - lower average rank wins)
    return a.averageRank - b.averageRank;
  });

  // Assign aggregate ranks (1 = best)
  const aggregatedRankings: Record<string, number> = {};
  sortedItems.forEach((item, index) => {
    aggregatedRankings[item.itemId] = index + 1;
  });

  return aggregatedRankings;
}

/**
 * Get detailed aggregation results for display purposes.
 * Includes total points and average rank for each item.
 */
export function getAggregationDetails(
  players: Pick<Player, 'rankings'>[],
  items: Pick<Item, 'id'>[]
): AggregatedItem[] {
  if (players.length === 0 || items.length === 0) {
    return [];
  }

  const itemPoints: AggregatedItem[] = [];

  for (const item of items) {
    let totalPoints = 0;
    let playerCount = 0;
    let totalRank = 0;

    for (const player of players) {
      const rank = player.rankings[item.id];
      if (rank !== undefined) {
        totalPoints += rankToPoints(rank);
        totalRank += rank;
        playerCount++;
      }
    }

    if (playerCount > 0) {
      itemPoints.push({
        itemId: item.id,
        totalPoints,
        averageRank: totalRank / playerCount,
        playerCount,
      });
    }
  }

  // Sort by total points (descending)
  return itemPoints.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    return a.averageRank - b.averageRank;
  });
}
