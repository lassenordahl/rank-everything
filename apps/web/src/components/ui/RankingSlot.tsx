/**
 * RankingSlot Component
 *
 * Single ranking slot (1-10) with optional item display.
 * Used in GameView for ranking and DesignShowcase.
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import type { Item } from '@rank-everything/shared-types';

export interface RankingSlotProps {
  /** Rank number (1-10) */
  rank: number;
  /** Item in this slot (if any) */
  item?: Pick<Item, 'text' | 'emoji'> | null;
  /** Click handler */
  onClick?: () => void;
  /** Whether slot is disabled (already used) */
  disabled?: boolean;
  /** Whether slot is interactive (clickable button vs static display) */
  interactive?: boolean;
  /** Optional class name override */
  className?: string;
}

export const RankingSlot = memo(function RankingSlot({
  rank,
  item,
  onClick,
  disabled = false,
  interactive = false,
  className = '',
}: RankingSlotProps) {
  // Inteactive mode for picking a slot (grids of buttons)
  if (interactive && onClick) {
    return (
      <motion.button
        onClick={onClick}
        disabled={disabled}
        className={`
          p-3 border-2 border-black font-bold transition-colors
          ${disabled ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed' : 'bg-white hover:bg-neutral-100'}
        `}
        whileHover={disabled ? {} : { scale: 1.05 }}
        whileTap={disabled ? {} : { scale: 0.95 }}
      >
        {rank}
      </motion.button>
    );
  }

  // Standard display mode (row in a list)
  return (
    <div
      onClick={interactive && !disabled ? onClick : undefined}
      className={`
        flex items-center gap-2 p-2 bg-white border-b border-neutral-200 last:border-0 text-sm
        ${interactive && !disabled ? 'cursor-pointer hover:bg-neutral-50 active:bg-neutral-100' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed bg-neutral-50' : ''}
        ${className}
      `}
    >
      <span className="font-mono font-bold text-neutral-400 w-5 text-right flex-shrink-0">
        {rank}.
      </span>
      {item ? (
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="truncate font-medium">{item.text}</span>
          {item.emoji && (
            <span className="ml-auto pl-1 flex-shrink-0 text-lg leading-none">{item.emoji}</span>
          )}
        </div>
      ) : (
        <span className="text-neutral-300">-</span>
      )}
    </div>
  );
});

export default RankingSlot;
