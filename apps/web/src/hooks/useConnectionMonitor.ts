import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useConnectionMonitor(isConnected: boolean) {
  const navigate = useNavigate();

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (!isConnected) {
      // If disconnected for more than 10 seconds, redirect to home
      timeout = setTimeout(() => {
        navigate('/?error=connection_lost');
      }, 10000);
    }
    return () => clearTimeout(timeout);
  }, [isConnected, navigate]);
}
