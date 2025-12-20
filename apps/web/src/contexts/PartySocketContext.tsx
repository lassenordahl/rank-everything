import PartySocket from 'partysocket';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { config } from '../lib/config';

interface PartySocketContextType {
  lastMessage: string | null;
  isConnected: boolean;
  joinRoom: (roomCode: string) => void;
  sendMessage: (message: string) => void;
}

const PartySocketContext = createContext<PartySocketContextType | null>(null);

export function PartySocketProvider({ children }: { children: ReactNode }) {
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const socketRef = useRef<PartySocket | null>(null);

  // Connect to room when activeRoom changes
  useEffect(() => {
    if (!activeRoom) return;

    // Close existing connection if any
    if (socketRef.current) {
      socketRef.current.close();
    }

    const socket = new PartySocket({
      host: config.wsBaseUrl.replace(/^wss?:\/\//, ''), // PartySocket expects host without protocol
      room: activeRoom,
      party: 'main', // Default party name
    });

    socketRef.current = socket;

    socket.addEventListener('open', () => {
      console.log('PartySocket connected');
      setIsConnected(true);

      const playerId = localStorage.getItem('playerId');
      if (playerId) {
        socket.send(JSON.stringify({ type: 'reconnect', playerId }));
      }
    });

    socket.addEventListener('message', (event) => {
      setLastMessage(event.data);
    });

    socket.addEventListener('close', () => {
      console.log('PartySocket disconnected');
      setIsConnected(false);
    });

    socket.addEventListener('error', (error) => {
      console.error('PartySocket error:', error);
    });

    return () => {
      socket.close();
    };
  }, [activeRoom]);

  const joinRoom = (roomCode: string) => {
    if (activeRoom !== roomCode) {
      setActiveRoom(roomCode);
    }
  };

  const sendMessage = (message: string) => {
    if (socketRef.current) {
      socketRef.current.send(message);
    }
  };

  return (
    <PartySocketContext.Provider value={{ lastMessage, isConnected, joinRoom, sendMessage }}>
      {children}
    </PartySocketContext.Provider>
  );
}

export function usePartySocketContext() {
  const context = useContext(PartySocketContext);
  if (!context) {
    throw new Error('usePartySocketContext must be used within a PartySocketProvider');
  }
  return context;
}
