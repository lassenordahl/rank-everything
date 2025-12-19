/**
 * RankingSlot Component
 *
 * Single ranking slot (1-10) with optional item display.
 * Used in GameView for ranking and DesignShowcase.
 */

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
  /** Compact mode for mini previews */
  compact?: boolean;
  /** Optional class name override */
  className?: string;
}

export function RankingSlot({
  rank,
  item,
  onClick,
  disabled = false,
  interactive = false,
  compact = false,
  className = '',
}: RankingSlotProps) {
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

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-1 text-xs bg-white border-b border-neutral-100 last:border-0">
        <span className="font-mono font-bold text-neutral-400 w-4 text-right flex-shrink-0">
          {rank}.
        </span>
        {item ? (
          <div className="flex items-center gap-1 min-w-0">
            <span>{item.emoji}</span>
            <span className="truncate">{item.text}</span>
          </div>
        ) : (
          <span className="text-neutral-300">-</span>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={interactive && !disabled ? onClick : undefined}
      className={`
        relative flex items-center gap-3 p-3 bg-white transition-colors
        ${interactive && !disabled ? 'cursor-pointer hover:bg-neutral-50 active:bg-neutral-100' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed bg-neutral-50' : ''}
        ${className}
      `}
    >
      <span className="font-mono font-bold text-neutral-400 w-6 text-right flex-shrink-0 text-lg">
        {rank}.
      </span>
      {item ? (
        <div className="flex items-center gap-2 min-w-0">
          {item.emoji && <span className="text-xl">{item.emoji}</span>}
          <span className="truncate">{item.text}</span>
        </div>
      ) : (
        <span className="text-neutral-300">-</span>
      )}
    </div>
  );
}

export default RankingSlot;
