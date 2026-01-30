/**
 * Crash Debug Page
 *
 * A comprehensive debugging tool for investigating mobile crashes.
 * All data persists to localStorage to survive crashes.
 *
 * This page displays:
 * 1. App-wide crash logs from crashLogger.ts (LLM events, etc.)
 * 2. Session-specific events for this debug page
 */

import { useState, useEffect, useCallback } from 'react';
import { performanceMonitor } from '../lib/performanceMonitor';
import { featureFlags, type FeatureFlags } from '../lib/featureFlags';
import { getCrashLogs, clearCrashLogs, type CrashLogEvent } from '../lib/crashLogger';

// ============================================================================
// Types
// ============================================================================

interface CrashSession {
  sessionId: string;
  startTime: number;
  endTime?: number;
  cleanExit: boolean;
  events: SessionEvent[];
  deviceInfo: DeviceInfo;
}

interface SessionEvent {
  timestamp: number;
  type: 'memory' | 'error' | 'action' | 'navigation' | 'crash_detection';
  message: string;
  data?: Record<string, unknown>;
}

interface DeviceInfo {
  userAgent: string;
  platform: string;
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  hardwareConcurrency: number;
  deviceMemory?: number;
  connection?: string;
  isMobile: boolean;
}

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  CURRENT_SESSION: 'crash_debug_current_session',
  SESSION_HISTORY: 'crash_debug_session_history',
  LAST_CLEAN_EXIT: 'crash_debug_last_clean_exit',
} as const;

const MAX_SESSIONS = 10;
const MAX_EVENTS = 200;

// ============================================================================
// Helpers
// ============================================================================

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getDeviceInfo(): DeviceInfo {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { effectiveType?: string };
  };

  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    devicePixelRatio: window.devicePixelRatio,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: nav.deviceMemory,
    connection: nav.connection?.effectiveType,
    isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
  };
}

function getStoredSessions(): CrashSession[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SESSION_HISTORY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveSessionHistory(sessions: CrashSession[]) {
  try {
    localStorage.setItem(
      STORAGE_KEYS.SESSION_HISTORY,
      JSON.stringify(sessions.slice(-MAX_SESSIONS))
    );
  } catch (e) {
    console.warn('Failed to save session history', e);
  }
}

function getCurrentSession(): CrashSession | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveCurrentSession(session: CrashSession) {
  try {
    // Trim events to prevent storage overflow
    const trimmedSession = {
      ...session,
      events: session.events.slice(-MAX_EVENTS),
    };
    localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(trimmedSession));
  } catch (e) {
    console.warn('Failed to save current session', e);
  }
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function getMemoryStatus(): { usedMB: number; percentUsed: number; status: 'ok' | 'warning' | 'critical' } | null {
  const memory = performanceMonitor.getMemoryUsage();
  if (!memory) return null;

  let status: 'ok' | 'warning' | 'critical' = 'ok';
  if (memory.percentUsed > 80) status = 'critical';
  else if (memory.percentUsed > 60) status = 'warning';

  return { ...memory, status };
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  container: {
    padding: '12px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '13px',
    backgroundColor: '#000',
    color: '#0f0',
    minHeight: '100vh',
    position: 'relative' as const,
    zIndex: 10,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    borderBottom: '2px solid #0f0',
    paddingBottom: '8px',
  },
  card: {
    backgroundColor: '#111',
    padding: '10px',
    borderRadius: '6px',
    marginBottom: '10px',
    border: '1px solid #333',
  },
  cardTitle: {
    margin: '0 0 8px 0',
    fontSize: '13px',
    fontWeight: 'bold' as const,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  alertCritical: {
    backgroundColor: '#400',
    border: '2px solid #f00',
    color: '#f88',
    padding: '10px',
    borderRadius: '6px',
    marginBottom: '10px',
  },
  alertWarning: {
    backgroundColor: '#440',
    border: '2px solid #ff0',
    color: '#ff8',
    padding: '10px',
    borderRadius: '6px',
    marginBottom: '10px',
  },
  button: {
    padding: '10px 14px',
    backgroundColor: '#222',
    color: '#fff',
    border: '1px solid #444',
    borderRadius: '6px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '13px',
    touchAction: 'manipulation' as const,
  },
  buttonDanger: {
    backgroundColor: '#500',
    borderColor: '#800',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '6px',
  },
  stat: {
    padding: '6px',
    backgroundColor: '#0a0a0a',
    borderRadius: '4px',
    textAlign: 'center' as const,
  },
  statValue: {
    fontSize: '16px',
    fontWeight: 'bold' as const,
  },
  statLabel: {
    fontSize: '10px',
    color: '#666',
  },
  eventList: {
    maxHeight: '300px',
    overflowY: 'auto' as const,
    fontSize: '11px',
  },
  eventItem: {
    borderBottom: '1px solid #222',
    padding: '4px 0',
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap' as const,
  },
};

// ============================================================================
// Component
// ============================================================================

const TRACKED_FLAGS: (keyof FeatureFlags)[] = ['enablePerformanceMonitoring', 'enableEmojiLLM', 'logMemoryUsage'];

export default function PerfDebug() {
  const [currentSession, setCurrentSession] = useState<CrashSession | null>(null);
  const [sessionHistory, setSessionHistory] = useState<CrashSession[]>([]);
  const [memoryStatus, setMemoryStatus] = useState(getMemoryStatus);
  const [featureFlagsState, setFeatureFlagsState] = useState<Record<string, boolean>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [crashDetected, setCrashDetected] = useState(false);
  const [appCrashLogs, setAppCrashLogs] = useState<CrashLogEvent[]>(() => getCrashLogs());

  // Add event to current session
  const addEvent = useCallback((type: SessionEvent['type'], message: string, data?: Record<string, unknown>) => {
    setCurrentSession((prev) => {
      if (!prev) return prev;
      const event: SessionEvent = { timestamp: Date.now(), type, message, data };
      const updated = {
        ...prev,
        events: [...prev.events, event].slice(-MAX_EVENTS),
      };
      saveCurrentSession(updated);
      return updated;
    });
  }, []);

  // Initialize session
  useEffect(() => {
    const previousSession = getCurrentSession();
    const wasCleanExit = localStorage.getItem(STORAGE_KEYS.LAST_CLEAN_EXIT) === 'true';
    localStorage.removeItem(STORAGE_KEYS.LAST_CLEAN_EXIT);

    // Check for crash from previous session
    if (previousSession && !previousSession.cleanExit && !wasCleanExit) {
      setCrashDetected(true);
      // Archive the crashed session
      const crashedSession: CrashSession = {
        ...previousSession,
        endTime: Date.now(),
        cleanExit: false,
      };
      crashedSession.events.push({
        timestamp: Date.now(),
        type: 'crash_detection',
        message: '⚠️ CRASH DETECTED - Session did not exit cleanly',
      });
      const history = getStoredSessions();
      history.push(crashedSession);
      saveSessionHistory(history);
      setSessionHistory(history);
    } else {
      setSessionHistory(getStoredSessions());
    }

    // Start new session
    const newSession: CrashSession = {
      sessionId: generateSessionId(),
      startTime: Date.now(),
      cleanExit: false,
      events: [],
      deviceInfo: getDeviceInfo(),
    };

    const memory = getMemoryStatus();
    newSession.events.push({
      timestamp: Date.now(),
      type: 'action',
      message: '🚀 Debug page loaded',
      data: {
        memory: memory ? `${memory.usedMB}MB (${memory.percentUsed}%)` : 'N/A',
        previousCrash: !wasCleanExit && previousSession ? 'YES' : 'NO',
      },
    });

    setCurrentSession(newSession);
    saveCurrentSession(newSession);

    // Load feature flags
    const flags: Record<string, boolean> = {};
    TRACKED_FLAGS.forEach((key) => {
      flags[key] = featureFlags.get(key);
    });
    setFeatureFlagsState(flags);

    // Mark clean exit on unload
    const handleUnload = () => {
      localStorage.setItem(STORAGE_KEYS.LAST_CLEAN_EXIT, 'true');
      const session = getCurrentSession();
      if (session) {
        session.cleanExit = true;
        session.endTime = Date.now();
        session.events.push({
          timestamp: Date.now(),
          type: 'action',
          message: '✅ Clean exit',
        });
        saveCurrentSession(session);
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  // Memory monitoring
  useEffect(() => {
    const checkMemory = () => {
      const status = getMemoryStatus();
      setMemoryStatus(status);

      if (status) {
        const prevStatus = memoryStatus?.status;
        if (status.status === 'critical' && prevStatus !== 'critical') {
          addEvent('memory', `🔴 CRITICAL: Memory at ${status.usedMB}MB (${status.percentUsed}%)`, { ...status });
        } else if (status.status === 'warning' && prevStatus !== 'warning' && prevStatus !== 'critical') {
          addEvent('memory', `🟡 WARNING: Memory at ${status.usedMB}MB (${status.percentUsed}%)`, { ...status });
        }
      }
    };

    const interval = setInterval(checkMemory, 2000);
    return () => clearInterval(interval);
  }, [addEvent, memoryStatus?.status]);

  // Error listener
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      addEvent('error', `❌ ${event.message}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      addEvent('error', `❌ Unhandled rejection: ${event.reason}`);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [addEvent]);

  // Toggle feature flag
  const toggleFlag = (key: keyof FeatureFlags) => {
    const newValue = !featureFlagsState[key];
    featureFlags.set(key, newValue);
    setFeatureFlagsState((prev) => ({ ...prev, [key]: newValue }));
    addEvent('action', `🏳️ ${key} = ${newValue}`);
  };

  // Clear all data
  const clearAllData = () => {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem('perf_errors');
    localStorage.removeItem('perf_snapshots');
    clearCrashLogs();
    setSessionHistory([]);
    setCrashDetected(false);
    setAppCrashLogs([]);
    addEvent('action', '🗑️ Cleared all debug data');
  };

  // Capture snapshot
  const captureSnapshot = () => {
    const snapshot = performanceMonitor.captureSnapshot('manual');
    addEvent('action', '📸 Snapshot captured', { memory: snapshot.memory });
  };

  // Generate crash report for copying
  const generateCrashReport = (): string => {
    const device = currentSession?.deviceInfo;
    const memory = memoryStatus;
    const crashedSessions = sessionHistory.filter((s) => !s.cleanExit);

    // Refresh app crash logs for the report
    const freshAppLogs = getCrashLogs();

    const report = [
      '=== CRASH DEBUG REPORT ===',
      `Generated: ${new Date().toISOString()}`,
      '',
      '--- DEVICE INFO ---',
      `Mobile: ${device?.isMobile ? 'YES' : 'NO'}`,
      `Screen: ${device?.screenWidth}x${device?.screenHeight} @${device?.devicePixelRatio}x`,
      `CPU cores: ${device?.hardwareConcurrency}`,
      `Device Memory: ${device?.deviceMemory ?? 'N/A'}GB`,
      `Connection: ${device?.connection ?? 'N/A'}`,
      `User Agent: ${device?.userAgent ?? 'N/A'}`,
      '',
      '--- CURRENT STATUS ---',
      `Memory: ${memory ? `${memory.usedMB}MB (${memory.percentUsed}%)` : 'N/A'}`,
      `Memory Status: ${memory?.status ?? 'N/A'}`,
      `Session Uptime: ${currentSession ? formatDuration(Date.now() - currentSession.startTime) : 'N/A'}`,
      `Total Crashes: ${crashedSessions.length}`,
      '',
      '--- FEATURE FLAGS ---',
      ...TRACKED_FLAGS.map((key) => `${key}: ${featureFlagsState[key] ? 'ON' : 'OFF'}`),
      '',
      '--- APP CRASH LOGS (LLM, WebSocket, etc.) ---',
      `Total events: ${freshAppLogs.length}`,
      ...freshAppLogs.slice(-30).map((e) =>
        `[${new Date(e.timestamp).toLocaleTimeString()}] [${e.category}] ${e.message}${e.data ? ` | ${JSON.stringify(e.data)}` : ''}`
      ),
    ];

    report.push('', '=== END REPORT ===');
    return report.join('\n');
  };

  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  const copyReportToClipboard = async () => {
    try {
      const report = generateCrashReport();
      await navigator.clipboard.writeText(report);
      setCopyStatus('copied');
      addEvent('action', '📋 Crash report copied to clipboard');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (e) {
      setCopyStatus('failed');
      addEvent('error', `Failed to copy report: ${e}`);
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  };

  const deviceInfo = currentSession?.deviceInfo;
  const crashedSessions = sessionHistory.filter((s) => !s.cleanExit);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={{ fontSize: '20px' }}>🔧</span>
        <h1 style={{ margin: 0, fontSize: '18px', color: '#0f0' }}>Crash Debug</h1>
        {crashDetected && (
          <span style={{ marginLeft: 'auto', color: '#f00', fontWeight: 'bold' }}>
            ⚠️ CRASH DETECTED
          </span>
        )}
      </div>

      {/* Crash Alert */}
      {crashDetected && (
        <div style={styles.alertCritical}>
          <strong>🚨 Previous session crashed!</strong>
          <p style={{ margin: '6px 0 0 0', fontSize: '12px' }}>
            The last session did not exit cleanly. Check session history below for details.
          </p>
        </div>
      )}

      {/* Memory Warning */}
      {memoryStatus?.status === 'critical' && (
        <div style={styles.alertCritical}>
          <strong>🔴 CRITICAL MEMORY PRESSURE</strong>
          <p style={{ margin: '6px 0 0 0' }}>
            {memoryStatus.usedMB}MB used ({memoryStatus.percentUsed}%) - Crash likely!
          </p>
        </div>
      )}
      {memoryStatus?.status === 'warning' && (
        <div style={styles.alertWarning}>
          <strong>🟡 Memory Warning</strong>
          <p style={{ margin: '6px 0 0 0' }}>
            {memoryStatus.usedMB}MB used ({memoryStatus.percentUsed}%)
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div style={{ ...styles.card }}>
        <h2 style={styles.cardTitle}>📊 Current Status</h2>
        <div style={styles.grid}>
          <div style={styles.stat}>
            <div style={{ ...styles.statValue, color: memoryStatus ? getMemoryColor(memoryStatus.status) : '#666' }}>
              {memoryStatus ? `${memoryStatus.usedMB}MB` : 'N/A'}
            </div>
            <div style={styles.statLabel}>Memory</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statValue}>
              {currentSession ? formatDuration(Date.now() - currentSession.startTime) : '-'}
            </div>
            <div style={styles.statLabel}>Uptime</div>
          </div>
          <div style={styles.stat}>
            <div style={{ ...styles.statValue, color: crashedSessions.length > 0 ? '#f00' : '#0f0' }}>
              {crashedSessions.length}
            </div>
            <div style={styles.statLabel}>Crashes</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statValue}>{currentSession?.events.length ?? 0}</div>
            <div style={styles.statLabel}>Events</div>
          </div>
        </div>
      </div>

      {/* Device Info */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>📱 Device</h2>
        {deviceInfo && (
          <div style={{ fontSize: '11px', lineHeight: 1.5 }}>
            <div><strong>Mobile:</strong> {deviceInfo.isMobile ? '✅ Yes' : '❌ No'}</div>
            <div><strong>Screen:</strong> {deviceInfo.screenWidth}×{deviceInfo.screenHeight} @{deviceInfo.devicePixelRatio}x</div>
            <div><strong>CPU cores:</strong> {deviceInfo.hardwareConcurrency}</div>
            {deviceInfo.deviceMemory && <div><strong>Device Memory:</strong> {deviceInfo.deviceMemory}GB</div>}
            {deviceInfo.connection && <div><strong>Connection:</strong> {deviceInfo.connection}</div>}
            <div style={{ marginTop: '4px', color: '#666', wordBreak: 'break-all' }}>
              <strong>UA:</strong> {deviceInfo.userAgent.slice(0, 80)}...
            </div>
          </div>
        )}
      </div>

      {/* Feature Flags */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>🏳️ Feature Flags</h2>
        {TRACKED_FLAGS.map((key) => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={featureFlagsState[key] ?? false}
              onChange={() => toggleFlag(key)}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ flex: 1, fontSize: '12px' }}>{key}</span>
            <span style={{ color: featureFlagsState[key] ? '#0f0' : '#f00', fontWeight: 'bold' }}>
              {featureFlagsState[key] ? 'ON' : 'OFF'}
            </span>
          </label>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
        <button
          onClick={copyReportToClipboard}
          style={{
            ...styles.button,
            backgroundColor: copyStatus === 'copied' ? '#060' : copyStatus === 'failed' ? '#600' : '#036',
            borderColor: '#08f',
            flex: '1 1 100%',
            fontWeight: 'bold',
          }}
        >
          {copyStatus === 'copied' ? '✅ Copied!' : copyStatus === 'failed' ? '❌ Failed' : '📋 Copy Crash Report'}
        </button>
        <button onClick={captureSnapshot} style={styles.button}>📸 Snapshot</button>
        <button onClick={() => setAppCrashLogs(getCrashLogs())} style={styles.button}>🔄 Refresh</button>
        <button onClick={() => setShowHistory(!showHistory)} style={styles.button}>
          📜 {showHistory ? 'Hide' : 'Show'} History
        </button>
        <button onClick={clearAllData} style={{ ...styles.button, ...styles.buttonDanger }}>
          🗑️ Clear All
        </button>
      </div>

      {/* App Crash Logs - THE MAIN USEFUL SECTION */}
      <div style={{ ...styles.card, border: '2px solid #0f0' }}>
        <h2 style={{ ...styles.cardTitle, color: '#0f0' }}>
          🔥 App Crash Logs ({appCrashLogs.length})
        </h2>
        <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#888' }}>
          These events are logged by the main app (LLM loading, etc.) and survive crashes.
        </p>
        <div style={styles.eventList}>
          {appCrashLogs
            .slice()
            .reverse()
            .map((event, i) => (
              <div key={i} style={styles.eventItem}>
                <span style={{ color: '#666', flexShrink: 0 }}>{formatTime(event.timestamp)}</span>
                <span style={{ color: getCategoryColor(event.category), fontWeight: 'bold' }}>[{event.category}]</span>
                <span style={{ wordBreak: 'break-word' }}>{event.message}</span>
                {event.data && (
                  <span style={{ color: '#666', fontSize: '10px' }}>{JSON.stringify(event.data)}</span>
                )}
              </div>
            ))}
          {appCrashLogs.length === 0 && (
            <div style={{ color: '#666' }}>No app crash logs yet. Navigate to main app to generate logs.</div>
          )}
        </div>
      </div>

      {/* Current Session Events */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>📜 Debug Page Events ({currentSession?.events.length ?? 0})</h2>
        <div style={styles.eventList}>
          {currentSession?.events
            .slice()
            .reverse()
            .map((event, i) => (
              <div key={i} style={styles.eventItem}>
                <span style={{ color: '#666', flexShrink: 0 }}>{formatTime(event.timestamp)}</span>
                <span style={{ color: getEventColor(event.type) }}>[{event.type}]</span>
                <span style={{ wordBreak: 'break-word' }}>{event.message}</span>
              </div>
            ))}
          {(!currentSession || currentSession.events.length === 0) && (
            <div style={{ color: '#666' }}>No events yet</div>
          )}
        </div>
      </div>

      {/* Session History */}
      {showHistory && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>📚 Session History ({sessionHistory.length})</h2>
          {sessionHistory.length === 0 ? (
            <div style={{ color: '#666' }}>No previous sessions</div>
          ) : (
            sessionHistory
              .slice()
              .reverse()
              .map((session, i) => (
                <details key={i} style={{ marginBottom: '8px' }}>
                  <summary
                    style={{
                      cursor: 'pointer',
                      padding: '6px',
                      backgroundColor: session.cleanExit ? '#0a0a0a' : '#300',
                      borderRadius: '4px',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>
                      {session.cleanExit ? '✅' : '⚠️'} {formatTime(session.startTime)}
                    </span>
                    <span style={{ color: '#666' }}>
                      {formatDuration((session.endTime ?? Date.now()) - session.startTime)} •{' '}
                      {session.events.length} events
                    </span>
                  </summary>
                  <div style={{ padding: '8px', backgroundColor: '#0a0a0a', borderRadius: '0 0 4px 4px', fontSize: '11px' }}>
                    {session.events.slice(-10).map((event, j) => (
                      <div key={j} style={{ marginBottom: '4px', color: getEventColor(event.type) }}>
                        {formatTime(event.timestamp)}: {event.message}
                      </div>
                    ))}
                    {session.events.length > 10 && (
                      <div style={{ color: '#666' }}>...and {session.events.length - 10} more</div>
                    )}
                  </div>
                </details>
              ))
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ color: '#444', fontSize: '10px', textAlign: 'center', marginTop: '16px' }}>
        Session: {currentSession?.sessionId ?? 'N/A'}
      </div>
    </div>
  );
}

function getMemoryColor(status: 'ok' | 'warning' | 'critical'): string {
  switch (status) {
    case 'critical': return '#f00';
    case 'warning': return '#ff0';
    default: return '#0f0';
  }
}

function getEventColor(type: SessionEvent['type']): string {
  switch (type) {
    case 'error':
    case 'crash_detection':
      return '#f00';
    case 'memory':
      return '#0ff';
    case 'navigation':
      return '#ff0';
    case 'action':
      return '#0f0';
    default:
      return '#fff';
  }
}

function getCategoryColor(category: CrashLogEvent['category']): string {
  switch (category) {
    case 'llm':
      return '#f0f'; // Magenta for LLM events
    case 'websocket':
      return '#0ff'; // Cyan
    case 'route':
      return '#ff0'; // Yellow
    case 'error':
      return '#f00'; // Red
    case 'memory':
      return '#0af'; // Light blue
    case 'lifecycle':
      return '#0f0'; // Green
    default:
      return '#fff';
  }
}
