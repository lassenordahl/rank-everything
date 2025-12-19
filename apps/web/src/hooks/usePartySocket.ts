import { useEffect } from 'react';
import { usePartySocketContext } from '../contexts/PartySocketContext';

export function usePartySocket(roomCode: string) {
  const { joinRoom, lastMessage, isConnected, sendMessage } = usePartySocketContext();

  useEffect(() => {
    if (roomCode) {
      joinRoom(roomCode);
    }
  }, [roomCode, joinRoom]);

  return { sendMessage, lastMessage, isConnected };
}
