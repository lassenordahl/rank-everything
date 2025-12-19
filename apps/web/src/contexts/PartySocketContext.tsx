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
  const wsRef = useRef<WebSocket | null>(null);

  // Connect to room when activeRoom changes
  useEffect(() => {
    if (!activeRoom) return;

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = `${config.wsBaseUrl}/party/${activeRoom}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);

      const playerId = localStorage.getItem('playerId');
      if (playerId) {
        ws.send(JSON.stringify({ type: 'reconnect', playerId }));
      }
    };

    ws.onmessage = (event) => {
      setLastMessage(event.data);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [activeRoom]);

  const joinRoom = (roomCode: string) => {
    if (activeRoom !== roomCode) {
      setActiveRoom(roomCode);
    }
  };

  const sendMessage = (message: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(message);
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
