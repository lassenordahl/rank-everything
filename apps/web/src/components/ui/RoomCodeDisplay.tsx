/**
 * RoomCodeDisplay Component
 *
 * Room code with optional copy and QR buttons.
 * Used in RoomLobby and DesignShowcase.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { transitions } from '../../lib/design-tokens';
import { COPY } from '../../lib/copy';

export interface RoomCodeDisplayProps {
  /** 4-letter room code */
  code: string;
  /** Show copy link button */
  showCopyButton?: boolean;
  /** Show QR code button */
  showQRButton?: boolean;
  /** QR button click handler */
  onQRClick?: () => void;
  /** Compact mode for mini previews */
  compact?: boolean;
}

export function RoomCodeDisplay({
  code,
  showCopyButton = true,
  showQRButton = false,
  onQRClick,
  compact = false,
}: RoomCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (compact) {
    return (
      <div className="text-center py-2">
        <p className="text-xs text-neutral-500 uppercase tracking-wide">Room Code</p>
        <p className="text-2xl font-bold tracking-[0.2em] font-mono">{code}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transitions.default}
      className="text-center mb-8"
    >
      <p className="text-muted text-sm uppercase tracking-wide mb-2">{COPY.labels.roomCode}</p>
      <h1 className="text-6xl font-bold tracking-[0.3em] font-mono mb-4">{code}</h1>
      {(showCopyButton || showQRButton) && (
        <div className="flex gap-2 justify-center">
          {showCopyButton && (
            <motion.button
              onClick={handleCopy}
              className="btn text-sm py-2 px-4"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {copied ? `✓ ${COPY.buttons.copiedLink}` : `🔗 ${COPY.buttons.copyLink}`}
            </motion.button>
          )}
          {showQRButton && onQRClick && (
            <motion.button
              onClick={onQRClick}
              className="btn text-sm py-2 px-4"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              📲 {COPY.buttons.shareQR}
            </motion.button>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default RoomCodeDisplay;
