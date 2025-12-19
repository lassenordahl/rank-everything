import type * as Party from 'partykit/server';
import { GameRoomState } from '../../state/GameRoomState';
import { submitItemSchema } from '@rank-everything/validation';
import { generateId } from '../../utils/id';
import { Item, ServerEvent } from '@rank-everything/shared-types';

export async function handleSubmitItem(
  message: { text: string },
  conn: Party.Connection,
  state: GameRoomState,
  broadcast: (event: ServerEvent) => void,
  saveToGlobalPool: (text: string, emoji: string) => Promise<void>,
  fetchEmoji: (text: string) => Promise<string>
): Promise<void> {
  const room = state.room;
  if (!room) return;

  const playerId = state.connections.get(conn.id);
  if (!playerId) {
    conn.send(JSON.stringify({ type: 'error', message: 'Not authenticated', code: 'UNAUTHORIZED' }));
    return;
  }

  // Validate input using Zod schema
  const result = submitItemSchema.safeParse(message);

  if (!result.success) {
    conn.send(JSON.stringify({
      type: 'error',
      message: result.error.errors[0].message,
    }));
    return;
  }

  const text = result.data.text;
  const trimmedText = text.trim().substring(0, 100);

  // Check for duplicates
  const isDuplicate = room.items.some(item => item.text.toLowerCase() === trimmedText.toLowerCase());
  if (isDuplicate) {
    conn.send(JSON.stringify({ type: 'error', message: 'Item already submitted', code: 'DUPLICATE_ITEM' }));
    return;
  }

  // Check turn (if round-robin)
  if (room.config.submissionMode === 'round-robin') {
    if (room.currentTurnPlayerId !== playerId) {
      conn.send(JSON.stringify({ type: 'error', message: 'Not your turn', code: 'NOT_YOUR_TURN' }));
      return;
    }
  } else if (room.config.submissionMode === 'host-only') {
    if (room.hostPlayerId !== playerId) {
      conn.send(JSON.stringify({ type: 'error', message: 'Only host can submit', code: 'NOT_HOST' }));
      return;
    }
  }

  const itemId = generateId();
  const emoji = await fetchEmoji(trimmedText);
  const now = Date.now();

  const newItem: Item = {
    id: itemId,
    text: trimmedText,
    emoji,
    submittedByPlayerId: playerId,
    submittedAt: now,
    roomId: room.id,
  };

  state.addItem(newItem);

  // Save to global pool asynchronously
  // We don't await this to keep response fast
  saveToGlobalPool(trimmedText, emoji).catch(console.error);

  broadcast({ type: 'item_submitted', item: newItem });

  // Advance turn if needed
  if (room.config.submissionMode === 'round-robin') {
     // Logic to advance turn needs to be handled by caller or state manager
     // For now we'll assume the caller (GameRoom) handles turn advancement or we move logic to state
     // Let's implement advanceTurn logic within state.ts or a separate helper?
     // Ideally `state.advanceTurn()` should exist.
     // But wait, server.ts has `advanceTurn()`. Let's move that to `state.ts` as well.
  }
}
