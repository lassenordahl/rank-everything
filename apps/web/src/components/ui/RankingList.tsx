/**
 * RankingList Component
 *
 * Full ranking list with dividers between slots.
 * Used in GameView, RevealScreen, and DesignShowcase.
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import type { Item } from '@rank-everything/shared-types';
import { RankingSlot } from './RankingSlot';

export interface RankingListProps {
  /** Player rankings: itemId -> rank */
  rankings: Record<string, number>;
  /** All items in the game */
  items: Pick<Item, 'id' | 'text' | 'emoji'>[];
  /** Number of slots to show (default: 10) */
  itemsPerGame?: number;
  /** Optional click handler for slots */
  onSlotClick?: (rank: number) => void;
  /** Make slots interactive (clickable) */
  interactive?: boolean;
  /** Used slots (for disabling) */
  usedSlots?: Set<number>;
  /** Show header */
  showHeader?: boolean;
  /** Header title */
  headerTitle?: string;
  /** Animate items */
  animate?: boolean;
  /** Optional class name override */
  className?: string;
  /**
   * Compare these rankings against another player's rankings.
   * Pass the viewer's rankings to show diff indicators.
   */
  compareToRankings?: Record<string, number>;
}

export const RankingList = memo(function RankingList({
  rankings,
  items,
  itemsPerGame = 10,
  onSlotClick,
  interactive = false,
  usedSlots = new Set(),
  showHeader = true,
  headerTitle = 'My Rankings',
  animate = true,
  className = '',
  compareToRankings,
}: RankingListProps) {
  // Build ranking -> item lookup
  const rankToItem = new Map<number, Pick<Item, 'id' | 'text' | 'emoji'>>();
  for (const item of items) {
    const rank = rankings[item.id];
    if (rank !== undefined) {
      rankToItem.set(rank, item);
    }
  }

  // Calculate comparison diff for each item
  // diff = viewer's rank - this player's rank
  // Positive means viewer ranked it higher (better), negative means lower
  const getComparisonDiff = (itemId: string | undefined): number | null => {
    if (!compareToRankings || !itemId) return null;

    const thisRank = rankings[itemId];
    const viewerRank = compareToRankings[itemId];

    if (thisRank === undefined || viewerRank === undefined) return null;

    // If viewer ranked it #1 and this player ranked it #3, diff is 3-1 = +2 (viewer ranked higher)
    // If viewer ranked it #3 and this player ranked it #1, diff is 1-3 = -2 (viewer ranked lower)
    return thisRank - viewerRank;
  };

  const slots = Array.from({ length: itemsPerGame }, (_, i) => i + 1);

  return (
    <div className={`border-2 border-black bg-white card-shadow w-full max-w-sm mx-auto ${className}`.trim()}>
      {showHeader && (
        <div className="border-b-2 border-black px-3 py-2">
          <h3 className="font-bold text-xs uppercase tracking-wide">{headerTitle}</h3>
        </div>
      )}
      <div className="p-3 space-y-0.5">
        {slots.map((rank, index) => {
          const item = rankToItem.get(rank);
          const comparisonDiff = getComparisonDiff(item?.id);

          // Always use motion.div to ensure consistent hook count between renders
          // Conditionally apply animation props instead of switching wrapper components
          return (
            <motion.div
              key={rank}
              initial={animate ? { opacity: 0, x: -10 } : false}
              animate={animate ? { opacity: 1, x: 0 } : false}
              transition={animate ? { delay: index * 0.03 } : undefined}
            >
              <RankingSlot
                rank={rank}
                item={item}
                onClick={onSlotClick ? () => onSlotClick(rank) : undefined}
                disabled={usedSlots.has(rank)}
                interactive={interactive}
                comparisonDiff={comparisonDiff}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});

export default RankingList;
