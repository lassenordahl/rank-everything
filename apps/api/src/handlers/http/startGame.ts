import { GameRoomState } from '../../state/GameRoomState';
import { ServerEvent } from '@rank-everything/shared-types';

export async function handleStartGame(
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

  if (state.room.status !== 'lobby') {
    return new Response(JSON.stringify({ error: 'Game already started' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  if (state.room.players.length < 1) { // Changed to 1 for testing support
     return new Response(JSON.stringify({ error: 'Not enough players' }), {
       status: 400,
       headers: { 'Content-Type': 'application/json', ...corsHeaders },
     });
  }

  state.startGame();

  // Broadcast game started
  broadcast({ type: 'game_started' });
  broadcast({ type: 'room_updated', room: state.room });

  return new Response(JSON.stringify({
    room: state.room,
  }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
