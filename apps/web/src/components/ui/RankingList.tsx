/**
 * RankingList Component
 *
 * Full ranking list with dividers between slots.
 * Used in GameView, RevealScreen, and DesignShowcase.
 */

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
}

export function RankingList({
  rankings,
  items,
  itemsPerGame = 10,
  onSlotClick,
  interactive = false,
  usedSlots = new Set(),
  showHeader = true,
  headerTitle = 'My Rankings',
  animate = true,
}: RankingListProps) {
  // Build ranking -> item lookup
  const rankToItem = new Map<number, Pick<Item, 'id' | 'text' | 'emoji'>>();
  for (const item of items) {
    const rank = rankings[item.id];
    if (rank !== undefined) {
      rankToItem.set(rank, item);
    }
  }

  const slots = Array.from({ length: itemsPerGame }, (_, i) => i + 1);

  return (
    <div className="border-2 border-black bg-white card-shadow w-full max-w-sm mx-auto">
      {showHeader && (
        <div className="border-b-2 border-black px-3 py-2">
          <h3 className="font-bold text-xs uppercase tracking-wide">{headerTitle}</h3>
        </div>
      )}
      <div className="p-3 space-y-0.5">
        {slots.map((rank, index) => {
          const item = rankToItem.get(rank);
          const Wrapper = animate ? motion.div : 'div';
          const animationProps = animate
            ? {
                initial: { opacity: 0, x: -10 },
                animate: { opacity: 1, x: 0 },
                transition: { delay: index * 0.03 },
              }
            : {};

          return (
            <Wrapper key={rank} {...animationProps}>
              <RankingSlot
                rank={rank}
                item={item}
                onClick={onSlotClick ? () => onSlotClick(rank) : undefined}
                disabled={usedSlots.has(rank)}
                interactive={interactive}
              />
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}

export default RankingList;
