/**
 * PlayerList Component
 *
 * List of players with connection status and host badge.
 * Used in RoomLobby and DesignShowcase.
 */

import type { Player } from '@rank-everything/shared-types';
import { PlayerAvatar } from './PlayerAvatar';
import { COPY } from '../../lib/copy';

export interface PlayerListProps {
  /** List of players */
  players: Pick<Player, 'id' | 'nickname' | 'connected'>[];
  /** Host player ID */
  hostId?: string;
  /** Show player count in header */
  showCount?: boolean;
}

export function PlayerList({ players, hostId, showCount = true }: PlayerListProps) {
  return (
    <div className="border-2 border-black bg-white card-shadow w-full max-w-sm">
      <div className="border-b-2 border-black px-3 py-2">
        <h2 className="text-xs font-bold uppercase tracking-wide">
          {COPY.labels.players} {showCount && `(${players.length})`}
        </h2>
      </div>
      <div className="p-3">
        <ul className="space-y-2">
          {players.map((player, index) => (
            <li key={player.id} className="flex items-center gap-2 text-sm">
              <PlayerAvatar name={player.nickname} colorIndex={index} size="sm" />
              <span className="font-medium">{player.nickname}</span>
              {player.id === hostId && (
                <span className="text-neutral-500 text-xs">{COPY.labels.host}</span>
              )}
              <span
                className={`ml-auto w-2 h-2 rounded-full ${
                  player.connected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default PlayerList;
