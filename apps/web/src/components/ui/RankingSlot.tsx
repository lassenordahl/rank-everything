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
  /**
   * Comparison diff: how many slots different from viewer's ranking.
   * Positive = you ranked this higher (green ↑)
   * Negative = you ranked this lower (red ↓)
   * Zero/undefined = same position or no comparison
   */
  comparisonDiff?: number | null;
}

export const RankingSlot = memo(function RankingSlot({
  rank,
  item,
  onClick,
  disabled = false,
  interactive = false,
  className = '',
  comparisonDiff,
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

  // Render comparison diff badge
  const renderComparisonBadge = () => {
    if (comparisonDiff === undefined || comparisonDiff === null || comparisonDiff === 0) {
      return null;
    }

    const isHigher = comparisonDiff > 0;
    const absValue = Math.abs(comparisonDiff);

    return (
      <span
        className={`
          text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 inline-flex items-center gap-0.5
          ${isHigher
            ? 'text-green-600 bg-green-100'
            : 'text-red-500 bg-red-100'
          }
        `}
      >
        <span>{isHigher ? `+${absValue}` : `-${absValue}`}</span>
        <span>{isHigher ? '↑' : '↓'}</span>
      </span>
    );
  };

  // Standard display mode (row in a list)
  return (
    <div
      onClick={interactive && !disabled ? onClick : undefined}
      className={`
        flex items-baseline gap-2 p-2 bg-white border-b border-neutral-200 last:border-0 text-sm
        ${interactive && !disabled ? 'cursor-pointer hover:bg-neutral-50 active:bg-neutral-100' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed bg-neutral-50' : ''}
        ${className}
      `}
    >
      <span className="font-mono font-bold text-neutral-400 w-5 text-right flex-shrink-0">
        {rank}.
      </span>
      {item ? (
        <div className="flex items-baseline gap-2 min-w-0 flex-1">
          <span className="font-medium break-words leading-tight">{item.text}</span>
          <div className="ml-auto flex items-baseline gap-1.5 flex-shrink-0">
            {renderComparisonBadge()}
            {item.emoji && (
              <span className="text-lg leading-none">{item.emoji}</span>
            )}
          </div>
        </div>
      ) : (
        <span className="text-neutral-300">-</span>
      )}
    </div>
  );
});

export default RankingSlot;
