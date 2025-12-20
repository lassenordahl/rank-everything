/**
 * RoomCodeDisplay Component
 *
 * Room code with optional copy and QR buttons.
 * Used in RoomLobby and DesignShowcase.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';

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
}

export function RoomCodeDisplay({
  code,
  showCopyButton = true,
  showQRButton = false,
  onQRClick,
}: RoomCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="text-center py-2">
      <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">
        {COPY.labels.roomCode}
      </p>
      <p className="text-4xl font-bold tracking-[0.2em] font-mono mb-3">{code}</p>

      {(showCopyButton || showQRButton) && (
        <div className="flex gap-2 justify-center">
          {showCopyButton && (
            <motion.button
              onClick={handleCopy}
              className="text-xs py-2 px-3 border-2 border-black bg-white hover:bg-black hover:text-white flex items-center gap-2 font-bold transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {copied ? `✓ ${COPY.buttons.copiedLink}` : `🔗 ${COPY.buttons.copyLink}`}
            </motion.button>
          )}
          {showQRButton && onQRClick && (
            <motion.button
              onClick={onQRClick}
              className="text-xs py-2 px-3 border-2 border-black bg-white hover:bg-black hover:text-white flex items-center gap-2 font-bold transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              📲 {COPY.buttons.shareQR}
            </motion.button>
          )}
        </div>
      )}
    </div>
  );
}

export default RoomCodeDisplay;
