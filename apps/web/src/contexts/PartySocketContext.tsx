import PartySocket from 'partysocket';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { config } from '../lib/config';
import { useConnectionStatus } from './ConnectionStatusContext';

// Heartbeat configuration
const HEARTBEAT_INTERVAL_MS = 10000; // Send heartbeat every 10 seconds
const HEARTBEAT_TIMEOUT_MS = 5000; // Wait 5 seconds for pong response

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
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPageVisibleRef = useRef(true);

  const { setSocketConnected, recordHeartbeat, isPageVisible } = useConnectionStatus();

  // Track page visibility in ref for use in intervals
  useEffect(() => {
    isPageVisibleRef.current = isPageVisible;
  }, [isPageVisible]);

  // Sync local state with connection status context
  const updateConnectionState = useCallback((connected: boolean) => {
    setIsConnected(connected);
    setSocketConnected(connected);
  }, [setSocketConnected]);

  // Connect to room when activeRoom changes
  useEffect(() => {
    if (!activeRoom) return;

    // Close existing connection if any
    if (socketRef.current) {
      socketRef.current.close();
    }

    // Clear any existing heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    const socket = new PartySocket({
      host: config.wsBaseUrl.replace(/^wss?:\/\//, ''), // PartySocket expects host without protocol
      room: activeRoom,
      party: 'main', // Default party name
      // PartySocket has built-in reconnection, configure it
      maxRetries: Infinity, // Keep trying forever
      minReconnectionDelay: 1000, // Start with 1 second
      maxReconnectionDelay: 30000, // Max 30 seconds between retries
    });

    socketRef.current = socket;

    socket.addEventListener('open', () => {
      console.log('[PartySocket] Connected');
      updateConnectionState(true);
      recordHeartbeat();

      const playerId = localStorage.getItem('playerId');
      if (playerId) {
        socket.send(JSON.stringify({ type: 'reconnect', playerId }));
      }

      // Start heartbeat
      heartbeatIntervalRef.current = setInterval(() => {
        // Only send heartbeat if page is visible (save battery on mobile)
        if (socket.readyState === WebSocket.OPEN && isPageVisibleRef.current) {
          // Send ping
          socket.send(JSON.stringify({ type: 'ping' }));

          // Set timeout for pong response
          heartbeatTimeoutRef.current = setTimeout(() => {
            console.log('[PartySocket] Heartbeat timeout - connection may be dead');
            // PartySocket will handle reconnection, but mark as disconnected
            // so UI can show reconnecting state
            if (socket.readyState !== WebSocket.OPEN) {
              updateConnectionState(false);
            }
          }, HEARTBEAT_TIMEOUT_MS);
        }
      }, HEARTBEAT_INTERVAL_MS);
    });

    socket.addEventListener('message', (event) => {
      // Check if it's a pong response
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'pong') {
          // Clear heartbeat timeout - connection is alive
          if (heartbeatTimeoutRef.current) {
            clearTimeout(heartbeatTimeoutRef.current);
            heartbeatTimeoutRef.current = null;
          }
          recordHeartbeat();
          return; // Don't propagate pong to app
        }
      } catch {
        // Not JSON, pass through
      }

      recordHeartbeat();
      setLastMessage(event.data);
    });

    socket.addEventListener('close', () => {
      console.log('[PartySocket] Disconnected');
      updateConnectionState(false);

      // Clear heartbeat on disconnect
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
        heartbeatTimeoutRef.current = null;
      }
    });

    socket.addEventListener('error', (error) => {
      console.error('[PartySocket] Error:', error);
    });

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
      }
      socket.close();
    };
  }, [activeRoom, updateConnectionState, recordHeartbeat]);

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
