import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ApiClient } from '../lib/api';
import { usePartySocket } from './usePartySocket';
import type { Room, Player, Item } from '@rank-everything/shared-types';

export function useGameRoom(code: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const playerId = localStorage.getItem('playerId');

  // 1. Fetch Room Data (HTTP) - Initial Load + Sync
  const {
    data: room,
    error: queryError,
    isLoading,
  } = useQuery({
    queryKey: ['room', code],
    queryFn: async () => {
      console.log(`[useGameRoom] Fetching room: ${code}`);
      const data = await ApiClient.getRoom(code);
      console.log(`[useGameRoom] Fetched room: ${data.room?.id}`);
      return data.room;
    },
    enabled: !!code,
    retry: false, // Don't retry 404s endlessly
  });

  // 2. Realtime Updates (WebSocket)
  const { lastMessage, isConnected, sendMessage } = usePartySocket(code);

  // Connection monitoring is now handled by ConnectionStatusContext

  useEffect(() => {
    if (!lastMessage) return;

    try {
      const event = JSON.parse(lastMessage);
      console.log(`[useGameRoom] Received event: ${event.type} for code: ${code}`);

      // Update data in cache immediately
      if (event.type === 'room_updated') {
        const roomEvent = event as { room: Room };
        const players = roomEvent.room.players.map((p: Player) => p.nickname).join(', ');
        console.log(
          `[useGameRoom] Setting query data for ${code}. Players (${roomEvent.room.players.length}): ${players}`
        );
        queryClient.setQueryData(['room', code], roomEvent.room);
      }

      // Handle turn changes (update currentTurnPlayerId and timer)
      if (event.type === 'turn_changed') {
        console.log(`[useGameRoom] Turn changed to: ${event.playerId}`);
        queryClient.setQueryData(['room', code], (oldRoom: Room | undefined) => {
          if (!oldRoom) return oldRoom;
          return {
            ...oldRoom,
            currentTurnPlayerId: event.playerId as string,
            timerEndAt: event.timerEndAt as number | null,
          };
        });
      }

      // Handle item submission (add item to list)
      if (event.type === 'item_submitted') {
        const itemEvent = event as { item: Item };
        console.log(`[useGameRoom] Item submitted: ${itemEvent.item.text}`);
        queryClient.setQueryData(['room', code], (oldRoom: Room | undefined) => {
          if (!oldRoom) return oldRoom;
          return {
            ...oldRoom,
            items: [...(oldRoom.items || []), itemEvent.item],
          };
        });
      }

      // Handle game ended
      // NOTE: We do NOT refetch here because:
      // 1. The server broadcasts room_updated immediately after game_ended
      // 2. Refetching here creates a race condition where stale data may overwrite
      //    the final items/rankings before room_updated arrives
      if (event.type === 'game_ended') {
        console.log(`[useGameRoom] Game ended. Waiting for room_updated with final state.`);
        // The room_updated event will follow and set the final state correctly
      }

      // Handle Navigation
      if (event.type === 'game_started') {
        // Optimistically update status before nav to prevent flash?
        // Or just let nav handle it.
        navigate(`/game/${code}`);
      }

      // Handle room reset (rematch)
      if (event.type === 'room_reset') {
        console.log(`[useGameRoom] Room reset, navigating to lobby`);
        queryClient.setQueryData(['room', code], event.room);
        navigate(`/${code}`);
      }

      // Handle config updates
      if (event.type === 'config_updated') {
        console.log(`[useGameRoom] Config updated`);
        queryClient.setQueryData(['room', code], (oldRoom: Room | undefined) => {
          if (!oldRoom) return oldRoom;
          return {
            ...oldRoom,
            config: event.config,
          };
        });
      }

      // Handle player reconnection (update connection status)
      if (event.type === 'player_reconnected') {
        const { playerId } = event as { playerId: string };
        console.log(`[useGameRoom] Player reconnected: ${playerId}`);
        queryClient.setQueryData(['room', code], (oldRoom: Room | undefined) => {
          if (!oldRoom) return oldRoom;
          return {
            ...oldRoom,
            players: oldRoom.players.map((p) =>
              p.id === playerId ? { ...p, connected: true } : p
            ),
          };
        });
      }

      // Handle player disconnect (update connection status)
      if (event.type === 'player_left') {
        const { playerId } = event as { playerId: string };
        console.log(`[useGameRoom] Player left: ${playerId}`);
        queryClient.setQueryData(['room', code], (oldRoom: Room | undefined) => {
          if (!oldRoom) return oldRoom;
          return {
            ...oldRoom,
            players: oldRoom.players.map((p) =>
              p.id === playerId ? { ...p, connected: false } : p
            ),
          };
        });
      }

      // Handle "Kicked" or "Room Closed"?
      // if (event.type === 'room_closed') navigate('/');
    } catch (e) {
      console.error('Failed to parse WS message', e);
    }
  }, [lastMessage, code, queryClient, navigate]);

  // Derived State
  const isHost = room?.hostPlayerId === playerId;
  const isMyTurn = room?.currentTurnPlayerId === playerId;

  return {
    room,
    error: queryError as Error | null,
    isLoading,
    isHost,
    isMyTurn,
    isConnected,
    sendMessage,
    lastMessage,
    playerId,
  };
}
