/**
 * GameStatusBadge Component
 *
 * A compact badge showing stacked player avatars and turn indicator.
 * Used during active gameplay to show who's playing and whose turn it is.
 */

import { motion } from 'framer-motion';
import { PlayerAvatar } from './PlayerAvatar';
import { COPY } from '../../lib/copy';

interface Player {
  id: string;
  nickname: string;
  connected?: boolean;
}

export interface GameStatusBadgeProps {
  /** Array of players in the game */
  players: Player[];
  /** ID of the player whose turn it is */
  currentTurnPlayerId?: string;
  /** Whether it's the current user's turn */
  isMyTurn: boolean;
  /** Current user's player ID */
  myPlayerId?: string;
}

const MAX_VISIBLE_AVATARS = 5;

export function GameStatusBadge({
  players,
  currentTurnPlayerId,
  isMyTurn,
}: GameStatusBadgeProps) {
  const currentPlayer = players.find((p) => p.id === currentTurnPlayerId);
  const visiblePlayers = players.slice(0, MAX_VISIBLE_AVATARS);
  const overflowCount = Math.max(0, players.length - MAX_VISIBLE_AVATARS);

  // Find current player's index for highlighting
  const getPlayerIndex = (playerId: string) => players.findIndex((p) => p.id === playerId);

  return (
    <motion.div
      layout
      className="inline-flex items-center gap-3 bg-white border-2 border-black px-3 py-2 shadow-[3px_3px_0_0_#000] max-w-full"
      transition={{ layout: { duration: 0.2, ease: 'easeInOut' } }}
    >
      {/* Stacked Avatars */}
      <div className="flex items-center -space-x-2">
        {visiblePlayers.map((player, index) => {
          const isCurrentTurn = player.id === currentTurnPlayerId;


          return (
            <motion.div
              key={player.id}
              className="relative"
              style={{ zIndex: isCurrentTurn ? 20 : 10 - index }}
              animate={
                isCurrentTurn
                  ? {
                      filter: ['brightness(1)', 'brightness(1.2)', 'brightness(1)'],
                    }
                  : {}
              }
              transition={isCurrentTurn ? { repeat: Infinity, duration: 1.5 } : undefined}
            >
              <PlayerAvatar
                name={player.nickname}
                colorIndex={getPlayerIndex(player.id)}
                size="sm"
                className=""
              />
            </motion.div>
          );
        })}
        {/* Overflow indicator */}
        {overflowCount > 0 && (
          <div className="w-6 h-6 rounded-full bg-neutral-200 border-2 border-black flex items-center justify-center text-xs font-bold z-0">
            +{overflowCount}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-black/20" />

      {/* Turn Status */}
      <motion.div layout className="flex items-center gap-2 min-w-0">
        {isMyTurn ? (
          <div className="flex items-center gap-2 text-red-500 font-bold text-sm">
            <span className="text-base">🎯</span>
            <span>{COPY.game.yourTurn}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-black/70 font-medium min-w-0">
            <span className="animate-pulse text-blue-500 flex-shrink-0">●</span>
            <span className="truncate">{currentPlayer?.nickname || '...'}'s turn</span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default GameStatusBadge;

