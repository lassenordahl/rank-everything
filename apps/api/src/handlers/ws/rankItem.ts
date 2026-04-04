import type * as Party from 'partykit/server';
import type { GameRoomState } from '../../state/GameRoomState';
import { rankItemSchema } from '@rank-everything/validation';
import type { ServerEvent } from '@rank-everything/shared-types';

export function handleRankItem(
  message: { itemId: string; ranking: number },
  conn: Party.Connection,
  state: GameRoomState,
  broadcast: (event: ServerEvent) => void
): void {
  const room = state.room;
  if (!room) return;

  const playerId = state.connections.get(conn.id);
  if (!playerId) {
    conn.send(
      JSON.stringify({ type: 'error', message: 'Not authenticated', code: 'UNAUTHORIZED' })
    );
    return;
  }

  // Validate input using Zod schema
  const result = rankItemSchema.safeParse(message);

  if (!result.success) {
    conn.send(
      JSON.stringify({ type: 'error', message: result.error.errors[0]?.message ?? 'Invalid input' })
    );
    return;
  }

  const { itemId, ranking } = result.data;
  const player = state.getPlayer(playerId as string);
  if (!player) return;

  // Check if slot is taken by another item
  const existingItemId = Object.keys(player.rankings).find(
    (key) => player.rankings[key] === ranking
  );
  if (existingItemId && existingItemId !== itemId) {
    // Swap: if the current item already had a ranking, move the displaced item there
    const currentItemOldRanking = player.rankings[itemId];
    if (currentItemOldRanking !== undefined) {
      player.rankings[existingItemId] = currentItemOldRanking;
    } else {
      // Current item had no ranking yet, so just clear the displaced item's slot
      delete player.rankings[existingItemId];
    }
  }

  player.rankings[itemId] = ranking;

  // Broadcast update not strictly necessary for every rank change if we want to keep traffic low,
  // but good for realtime feedback. We can just send room_updated
  broadcast({ type: 'room_updated', room });
}
