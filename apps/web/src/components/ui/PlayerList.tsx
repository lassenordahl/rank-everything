/**
 * PlayerList Component
 *
 * List of players with connection status and host badge.
 * Used in RoomLobby and DesignShowcase.
 */

import { motion } from 'framer-motion';
import type { Player } from '@rank-everything/shared-types';
import { PlayerAvatar } from './PlayerAvatar';
import { componentClasses, animations, transitions } from '../../lib/design-tokens';
import { COPY } from '../../lib/copy';

export interface PlayerListProps {
  /** List of players */
  players: Pick<Player, 'id' | 'nickname' | 'connected'>[];
  /** Host player ID */
  hostId?: string;
  /** Show player count in header */
  showCount?: boolean;
  /** Compact mode for mini previews */
  compact?: boolean;
  /** Animate items */
  animate?: boolean;
}

export function PlayerList({
  players,
  hostId,
  showCount = true,
  compact = false,
  animate = true,
}: PlayerListProps) {
  if (compact) {
    return (
      <div className="border-2 border-black p-2">
        <p className="text-xs font-bold mb-1">
          {COPY.labels.players} ({players.length})
        </p>
        <div className="space-y-1">
          {players.slice(0, 4).map((player, i) => (
            <div key={player.id} className="flex items-center gap-1 text-xs">
              <PlayerAvatar name={player.nickname} colorIndex={i} size="sm" />
              <span>{player.nickname}</span>
              {player.id === hostId && (
                <span className="text-neutral-500 text-[10px]">{COPY.labels.host}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={componentClasses.card + ' w-full max-w-sm mb-8'}>
      <div className={componentClasses.cardHeader}>
        <h2 className="font-bold">
          {COPY.labels.players} {showCount && `(${players.length})`}
        </h2>
      </div>
      <ul className="divide-y divide-neutral-200">
        {players.map((player, index) => {
          const Wrapper = animate ? motion.li : 'li';
          const animationProps = animate
            ? {
                variants: animations.staggerItem,
                initial: 'initial',
                animate: 'animate',
                transition: { ...transitions.default, delay: index * 0.05 },
              }
            : {};

          return (
            <Wrapper
              key={player.id}
              className="flex items-center gap-3 px-4 py-3"
              {...animationProps}
            >
              <PlayerAvatar name={player.nickname} colorIndex={index} size="md" />
              <span className="font-medium flex-1">{player.nickname}</span>
              {player.id === hostId && (
                <span className="text-muted text-sm">{COPY.labels.host}</span>
              )}
              <span className={player.connected ? 'text-green-600' : 'text-red-600'}>
                {player.connected ? '●' : '○'}
              </span>
            </Wrapper>
          );
        })}
      </ul>
    </div>
  );
}

export default PlayerList;
