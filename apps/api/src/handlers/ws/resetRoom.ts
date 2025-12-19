/**
 * Reset Room Handler
 *
 * Handles the 'reset_room' WebSocket event. Resets the room to lobby state
 * for a rematch. Only the host can reset the room.
 */

import type { ServerEvent } from '@rank-everything/shared-types';
import type { GameRoomState } from '../../state/GameRoomState';
import type * as Party from 'partykit/server';

export function handleResetRoom(
  conn: Party.Connection,
  state: GameRoomState,
  broadcast: (event: ServerEvent) => void
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
        message: 'Only the host can reset the room',
        code: 'NOT_HOST',
      })
    );
    return false;
  }

  // Reset the room
  state.resetRoom();

  // Broadcast room reset to all clients
  broadcast({
    type: 'room_reset',
    room: state.room,
  });

  console.log(`[ResetRoom] Room ${state.room.id} reset to lobby by host ${playerId}`);
  return true;
}
