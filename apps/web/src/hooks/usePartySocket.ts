import { useEffect, useState, useCallback, useRef } from 'react';

export function usePartySocket(roomCode: string) {
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!roomCode) return;

    // Connect to PartyKit WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.DEV ? 'localhost:1999' : window.location.host;
    const wsUrl = `${protocol}//${host}/party/${roomCode}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);

      // Send reconnect if we have a stored player ID
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
  }, [roomCode]);

  const sendMessage = useCallback((message: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(message);
    }
  }, []);

  return { sendMessage, lastMessage, isConnected };
}
