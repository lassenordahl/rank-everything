import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConnectionStatusContextType {
  isConnected: boolean;
  isPageVisible: boolean;
  isReconnecting: boolean;
  lastHeartbeat: number | null;
  setSocketConnected: (connected: boolean) => void;
  recordHeartbeat: () => void;
}

const ConnectionStatusContext = createContext<ConnectionStatusContextType | null>(null);

// How long before we consider a heartbeat "stale" and show reconnecting UI
const HEARTBEAT_STALE_MS = 15000; // 15 seconds
// How long to wait before showing the reconnecting toast (avoid flashing on brief disconnects)
const RECONNECTING_DELAY_MS = 2000; // 2 seconds
// How long disconnection is tolerated before redirecting home
const MAX_DISCONNECT_MS = 120000; // 2 minutes (increased from 30 seconds)

export function ConnectionStatusProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const lastHeartbeat = useRef<number | null>(null);
  const disconnectedAt = useRef<number | null>(null);
  const reconnectingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsPageVisible(visible);
      console.log(`[ConnectionStatus] Page visibility changed: ${visible ? 'visible' : 'hidden'}`);

      // When page becomes visible again, reset the disconnect timer
      // The actual reconnection is handled by PartySocket
      if (visible && disconnectedAt.current) {
        console.log('[ConnectionStatus] Page became visible, giving connection time to recover');
        // Give it a fresh window to reconnect
        disconnectedAt.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Handle connection state changes
  const setSocketConnected = useCallback((connected: boolean) => {
    setIsConnected(connected);

    if (connected) {
      // Connection restored
      console.log('[ConnectionStatus] Connection restored');
      disconnectedAt.current = null;
      setIsReconnecting(false);
      setShowToast(false);

      // Clear timers
      if (reconnectingTimerRef.current) {
        clearTimeout(reconnectingTimerRef.current);
        reconnectingTimerRef.current = null;
      }
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    } else {
      // Connection lost
      console.log('[ConnectionStatus] Connection lost');
      disconnectedAt.current = Date.now();

      // Show "reconnecting" toast after a delay (avoid flashing on brief disconnects)
      if (!reconnectingTimerRef.current) {
        reconnectingTimerRef.current = setTimeout(() => {
          // Only show if still disconnected AND page is visible
          if (disconnectedAt.current && document.visibilityState === 'visible') {
            setIsReconnecting(true);
            setShowToast(true);
          }
          reconnectingTimerRef.current = null;
        }, RECONNECTING_DELAY_MS);
      }

      // Set up redirect timer (but only when page is visible)
      // We DON'T redirect when page is hidden - mobile browsers drop connections
      // when backgrounded and this is expected behavior
      if (!redirectTimerRef.current) {
        redirectTimerRef.current = setTimeout(() => {
          // Only redirect if STILL disconnected AND page is visible for a while
          if (disconnectedAt.current && document.visibilityState === 'visible') {
            const elapsed = Date.now() - disconnectedAt.current;
            if (elapsed >= MAX_DISCONNECT_MS) {
              console.log('[ConnectionStatus] Connection lost for too long, redirecting');
              // Use soft navigation instead of hard reload
              window.location.href = '/?error=connection_lost';
            }
          }
          redirectTimerRef.current = null;
        }, MAX_DISCONNECT_MS);
      }
    }
  }, []);

  const recordHeartbeat = useCallback(() => {
    lastHeartbeat.current = Date.now();
  }, []);

  // Check for stale heartbeats
  useEffect(() => {
    const checkHeartbeat = () => {
      if (lastHeartbeat.current && isConnected) {
        const elapsed = Date.now() - lastHeartbeat.current;
        if (elapsed > HEARTBEAT_STALE_MS) {
          console.log('[ConnectionStatus] Heartbeat stale, connection may be dead');
          // Don't immediately mark as disconnected, but show warning
          if (!isReconnecting && document.visibilityState === 'visible') {
            setIsReconnecting(true);
            setShowToast(true);
          }
        }
      }
    };

    const interval = setInterval(checkHeartbeat, 5000);
    return () => clearInterval(interval);
  }, [isConnected, isReconnecting]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (reconnectingTimerRef.current) clearTimeout(reconnectingTimerRef.current);
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  return (
    <ConnectionStatusContext.Provider
      value={{
        isConnected,
        isPageVisible,
        isReconnecting,
        lastHeartbeat: lastHeartbeat.current,
        setSocketConnected,
        recordHeartbeat,
      }}
    >
      {children}

      {/* Reconnecting Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-white text-black border-2 border-black px-6 py-3 shadow-[4px_4px_0_0_#000000] flex items-center gap-3">
              <span className="animate-spin text-xl font-bold">⟳</span>
              <span className="font-bold uppercase tracking-wide">Reconnecting...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConnectionStatusContext.Provider>
  );
}

export function useConnectionStatus() {
  const context = useContext(ConnectionStatusContext);
  if (!context) {
    throw new Error('useConnectionStatus must be used within a ConnectionStatusProvider');
  }
  return context;
}
