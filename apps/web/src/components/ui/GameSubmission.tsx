/**
 * GameSubmission Component
 *
 * Compact submission form with emoji preview, input, and action buttons.
 * Matches the tight, blocky layout from the design mocks.
 */

import { motion } from 'framer-motion';
import { Dice5 } from 'lucide-react';
import { componentClasses } from '../../lib/design-tokens';
import { COPY } from '../../lib/copy';

interface GameSubmissionProps {
  /** Current input value */
  value: string;
  /** On change handler */
  onChange: (value: string) => void;
  /** On submit handler */
  onSubmit: () => void;
  /** On random roll click */
  onRandomClick: () => void;
  /** Is the model classifying? */
  isClassifying?: boolean;
  /** Is the model loading? */
  isModelLoading?: boolean;
  /** Loading progress */
  modelProgress?: number;
  /** Classified emoji */
  classifiedEmoji?: string | null;
  /** Placeholder text */
  placeholder?: string;
}

export function GameSubmission({
  value,
  onChange,
  onSubmit,
  onRandomClick,
  isClassifying = false,
  isModelLoading = false,
  modelProgress = 0,
  classifiedEmoji = null,
  placeholder = COPY.game.enterItem,
}: GameSubmissionProps) {
  return (
    <div className="flex flex-col w-full max-w-md mx-auto relative group">
      {/* Top Row: Emoji + Input */}
      <div className="flex bg-white h-14 border-2 border-black z-10 focus-within:ring-0 focus-within:border-black focus-within:shadow-[0_0_0_2px_black] relative">
        {/* Emoji Box */}
        <div className="w-14 flex items-center justify-center border-r-2 border-black bg-neutral-50 flex-shrink-0">
          <motion.div
            animate={isClassifying ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 0.5 }}
          >
            {isModelLoading ? (
              <span className="text-[10px] text-neutral-500 font-mono text-center leading-none block">
                {modelProgress}%
              </span>
            ) : isClassifying ? (
              <span className="text-xl">⏳</span>
            ) : classifiedEmoji ? (
              <span className="text-2xl">{classifiedEmoji}</span>
            ) : (
              <span className="text-2xl grayscale opacity-50">🤖</span>
            )}
          </motion.div>
        </div>

        {/* Input */}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          placeholder={placeholder}
          className="flex-1 w-full px-4 py-2 border-0 focus:ring-0 focus:outline-none bg-transparent placeholder:text-neutral-400 text-lg/none"
          autoFocus={true}
        />
      </div>

      {/* Bottom Row: Submit + Random */}
      {/* Negative margin-top to merge borders if we wanted, but border-t-0 is cleaner */}
      <div className="flex h-14">
        <motion.button
          onClick={onSubmit}
          disabled={!value.trim()}
          initial="idle"
          whileHover="hover"
          whileTap="tap"
          className={`${componentClasses.buttonAccent} flex-1 flex items-center justify-center border-2 border-black border-t-0 border-r-0 overflow-hidden`}
        >
          <motion.span
            className="text-lg font-bold uppercase tracking-widest"
            variants={{
              idle: { scale: 1 },
              hover: { scale: 1.05 },
              tap: { scale: 0.95 },
            }}
          >
            {COPY.game.submit}
          </motion.span>
        </motion.button>

        <motion.button
          onClick={onRandomClick}
          initial="idle"
          whileHover="hover"
          whileTap="tap"
          className="w-14 h-14 flex items-center justify-center border-2 border-black border-t-0 bg-white hover:bg-neutral-50 text-black transition-colors"
          title="Random Roll"
        >
          <motion.div
            variants={{
              idle: { scale: 1, rotate: 0 },
              hover: { scale: 1.15, rotate: 15 },
              tap: { scale: 0.9, rotate: -15 },
            }}
          >
            <Dice5 className="w-8 h-8" strokeWidth={1.5} />
          </motion.div>
        </motion.button>
      </div>
    </div>
  );
}
