import type { RoomConfig } from '@rank-everything/shared-types';
import type { GameRoomState } from '../../state/GameRoomState';
import { createRoomSchema } from '@rank-everything/validation';
import { generateId } from '../../utils/id';

export async function handleCreateRoom(
  req: Request,
  roomId: string,
  state: GameRoomState,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (state.room) {
    return new Response(JSON.stringify({ error: 'Room already exists' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const { nickname, config } = (await req.json()) as {
    nickname: string;
    config?: Partial<RoomConfig>;
  };

  // Validate input using Zod schema
  const result = createRoomSchema.safeParse({ nickname, config });

  if (!result.success) {
    return new Response(JSON.stringify({ error: result.error.errors[0].message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const hostPlayerId = generateId();

  // Create room in state
  state.createRoom(roomId, hostPlayerId, result.data.nickname, result.data.config);

  // Need to persist storage - this should be done by the caller or we pass a persist callback
  // For now we assume the caller will handle persistence if needed or we update state methods to be sync

  return new Response(
    JSON.stringify({
      roomCode: roomId,
      playerId: hostPlayerId,
      room: state.room,
    }),
    {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    }
  );
}
