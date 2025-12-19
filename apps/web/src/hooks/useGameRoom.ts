import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ApiClient } from '../lib/api';
import { usePartySocket } from './usePartySocket';
import { useConnectionMonitor } from './useConnectionMonitor';

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

  // Monitor connection health
  useConnectionMonitor(isConnected);

  useEffect(() => {
    if (!lastMessage) return;

    try {
      const event = JSON.parse(lastMessage);
      console.log(`[useGameRoom] Received event: ${event.type} for code: ${code}`);

      // Update data in cache immediately
      if (event.type === 'room_updated') {
        const players = event.room?.players?.map((p: any) => p.nickname).join(', ');
        console.log(
          `[useGameRoom] Setting query data for ${code}. Players (${event.room?.players?.length}): ${players}`
        );
        queryClient.setQueryData(['room', code], event.room);
      }

      // Handle turn changes (update currentTurnPlayerId and timer)
      if (event.type === 'turn_changed') {
        console.log(`[useGameRoom] Turn changed to: ${event.playerId}`);
        queryClient.setQueryData(['room', code], (oldRoom: any) => {
          if (!oldRoom) return oldRoom;
          return {
            ...oldRoom,
            currentTurnPlayerId: event.playerId,
            timerEndAt: event.timerEndAt,
          };
        });
      }

      // Handle item submission (add item to list)
      if (event.type === 'item_submitted') {
        console.log(`[useGameRoom] Item submitted: ${event.item?.text}`);
        queryClient.setQueryData(['room', code], (oldRoom: any) => {
          if (!oldRoom) return oldRoom;
          return {
            ...oldRoom,
            items: [...(oldRoom.items || []), event.item],
          };
        });
      }

      // Handle Navigation
      if (event.type === 'game_started') {
        // Optimistically update status before nav to prevent flash?
        // Or just let nav handle it.
        navigate(`/game/${code}`);
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
