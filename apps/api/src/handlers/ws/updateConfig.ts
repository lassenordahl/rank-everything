/**
 * Update Config Handler
 *
 * Handles the 'update_config' WebSocket event. Allows the host to update
 * room settings while in lobby state.
 */

import type { ServerEvent, RoomConfig } from '@rank-everything/shared-types';
import type { GameRoomState } from '../../state/GameRoomState';
import type * as Party from 'partykit/server';

export function handleUpdateConfig(
  conn: Party.Connection,
  state: GameRoomState,
  broadcast: (event: ServerEvent) => void,
  config: Partial<RoomConfig>
): boolean {
  if (!state.room) return false;

  // Get player ID from connection
  const playerId = state.connections.get(conn.id);
  if (!playerId) {
    conn.send(
      JSON.stringify({
        type: 'error',
        message: 'Not connected to room',
        code: 'NOT_CONNECTED',
      })
    );
    return false;
  }

  // Verify sender is host
  if (state.room.hostPlayerId !== playerId) {
    conn.send(
      JSON.stringify({
        type: 'error',
        message: 'Only the host can change settings',
        code: 'NOT_HOST',
      })
    );
    return false;
  }

  // Verify room is in lobby state
  if (state.room.status !== 'lobby') {
    conn.send(
      JSON.stringify({
        type: 'error',
        message: 'Can only change settings in lobby',
        code: 'GAME_IN_PROGRESS',
      })
    );
    return false;
  }

  // Update config
  state.updateConfig(config);

  // Broadcast config update to all clients
  broadcast({
    type: 'config_updated',
    config: state.room.config,
  });

  // Also broadcast room_updated for full state sync
  broadcast({
    type: 'room_updated',
    room: state.room,
  });

  console.log(`[UpdateConfig] Room ${state.room.id} config updated by host ${playerId}`);
  return true;
}
