import { useEffect } from 'react';
import { usePartySocketContext } from '../contexts/PartySocketContext';

export function usePartySocket(roomCode: string) {
  const { joinRoom, lastMessage, isConnected, sendMessage } = usePartySocketContext();

  useEffect(() => {
    if (roomCode) {
      joinRoom(roomCode);
    }
  }, [roomCode, joinRoom]);

  useEffect(() => {
    if (!lastMessage) return;
    try {
        const event = JSON.parse(lastMessage);
        if (event.type === 'game_started') {
            const code = window.location.pathname.split('/').pop();
            console.log(`[useGameRoom] Game started event received for room ${code}`);
        }
    } catch(e) {}
  }, [lastMessage]);

  return { sendMessage, lastMessage, isConnected };
}
