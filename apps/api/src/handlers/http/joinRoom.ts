import type { GameRoomState } from '../../state/GameRoomState';
import { joinRoomSchema } from '@rank-everything/validation';
import { generateId } from '../../utils/id';
import type { ServerEvent, Player } from '@rank-everything/shared-types';

export async function handleJoinRoom(
  req: Request,
  state: GameRoomState,
  broadcast: (event: ServerEvent) => void,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (!state.room) {
    return new Response(JSON.stringify({ error: 'Room not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // Don't allow joining ended games
  if (state.room.status === 'ended') {
    return new Response(JSON.stringify({ error: 'Game has ended' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const nickname = (body.nickname as string) || '';

  // Validate input using Zod schema
  const result = joinRoomSchema.safeParse({ nickname });

  if (!result.success) {
    return new Response(
      JSON.stringify({ error: result.error.errors[0]?.message ?? 'Invalid input' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }

  // Check for duplicate nickname
  const normalize = (s: string) => s.trim().toLowerCase();
  const isDuplicate = state.room.players.some(
    (p) => normalize(p.nickname) === normalize(result.data.nickname)
  );

  if (isDuplicate) {
    return new Response(JSON.stringify({ error: 'Be original! That name is taken.' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const playerId = generateId();
  const now = Date.now();

  // Determine if this is a late join (game in progress with existing items)
  const isLateJoin = state.room?.status === 'in-progress' && state.room.items.length > 0;

  const player: Player = {
    id: playerId,
    nickname: result.data.nickname,
    roomId: state.room.id,
    connected: false, // Connected via WS later
    rankings: {},
    joinedAt: now,
    isCatchingUp: isLateJoin, // Late joiners need to catch up on rankings
  };

  state.addPlayer(player);

  // Broadcast update
  broadcast({ type: 'room_updated', room: state.room });

  return new Response(
    JSON.stringify({
      playerId,
      room: state.room,
    }),
    {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    }
  );
}
