import type * as Party from 'partykit/server';
import type { GameRoomState } from '../../state/GameRoomState';
import { submitItemSchema } from '@rank-everything/validation';
import { generateId } from '../../utils/id';
import type { Item, ServerEvent } from '@rank-everything/shared-types';

/**
 * Validate that a string is a valid emoji (unicode only)
 * Rejects anything that's not a proper emoji character
 */
export function isValidEmoji(str: string): boolean {
  if (!str || str.length === 0 || str.length > 8) return false;

  // Comprehensive emoji unicode ranges including variation selectors
  // FE0F is the variation selector that makes text-style emojis display as emoji-style
  const emojiRegex =
    // eslint-disable-next-line no-misleading-character-class
    /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{1FA00}-\u{1FAFF}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{203C}\u{2049}\u{20E3}\u{00A9}\u{00AE}\u{2764}\u{FE0F}]+$/u;
  return emojiRegex.test(str);
}

export async function handleSubmitItem(
  message: { text: string; emoji?: string },
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
    conn.send(
      JSON.stringify({ type: 'error', message: 'Not authenticated', code: 'UNAUTHORIZED' })
    );
    return;
  }

  // Check if game has reached item limit
  if (room.items.length >= room.config.itemsPerGame) {
    conn.send(
      JSON.stringify({ type: 'error', message: 'Item limit reached', code: 'ITEM_LIMIT_REACHED' })
    );
    return;
  }

  // Validate input using Zod schema
  const result = submitItemSchema.safeParse(message);

  if (!result.success) {
    conn.send(
      JSON.stringify({
        type: 'error',
        message: result.error.errors[0]?.message ?? 'Invalid input',
      })
    );
    return;
  }

  const text = result.data.text;
  const trimmedText = text.trim().substring(0, 100);

  // Check for duplicates
  const isDuplicate = room.items.some(
    (item) => item.text.toLowerCase() === trimmedText.toLowerCase()
  );
  if (isDuplicate) {
    conn.send(
      JSON.stringify({ type: 'error', message: 'Item already submitted', code: 'DUPLICATE_ITEM' })
    );
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
      conn.send(
        JSON.stringify({ type: 'error', message: 'Only host can submit', code: 'NOT_HOST' })
      );
      return;
    }
  }

  const itemId = generateId();

  // Use client-provided emoji if valid, otherwise generate server-side
  let emoji: string;
  if (message.emoji && isValidEmoji(message.emoji)) {
    emoji = message.emoji;
    console.log(`[SubmitItem] Using client-provided emoji: ${emoji}`);
  } else {
    emoji = await fetchEmoji(trimmedText);
    console.log(`[SubmitItem] Generated server-side emoji: ${emoji}`);
  }

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
