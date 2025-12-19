import type * as Party from 'partykit/server';
import { GameRoomState } from '../../state/GameRoomState';
import { ServerEvent } from '@rank-everything/shared-types';

export function handleSkipTurn(
    conn: Party.Connection,
    state: GameRoomState,
    broadcast: (event: ServerEvent) => void
): boolean { // Returns true if turn changed
    const room = state.room;
    if (!room || room.status !== 'in-progress') return false;

    const playerId = state.connections.get(conn.id);
    if (!playerId) return false;

    if (room.currentTurnPlayerId !== playerId) {
        conn.send(JSON.stringify({ type: 'error', message: 'Not your turn', code: 'NOT_YOUR_TURN' }));
        return false;
    }

    return true; // Signal caller to advance turn
}
