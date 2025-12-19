import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export function useConnectionMonitor(isConnected: boolean) {
  const navigate = useNavigate();
  const hasEverConnected = useRef(false);

  // Track if we've ever successfully connected
  useEffect(() => {
    if (isConnected) {
      hasEverConnected.current = true;
    }
  }, [isConnected]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    // Only redirect if we WERE connected and lost connection
    // Don't redirect during initial connection attempt
    if (!isConnected && hasEverConnected.current) {
      // If disconnected for more than 30 seconds, redirect to home
      timeout = setTimeout(() => {
        navigate('/?error=connection_lost');
      }, 30000);
    }

    return () => clearTimeout(timeout);
  }, [isConnected, navigate]);
}
