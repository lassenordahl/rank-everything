/**
 * Crash Logger
 *
 * A simple, persistent logger that writes to localStorage immediately.
 * Designed to capture events that survive crashes.
 *
 * This is separate from the debug page - it captures events across the ENTIRE app.
 */

const CRASH_LOG_KEY = 'crash_logger_events';
const MAX_EVENTS = 100;

export interface CrashLogEvent {
  timestamp: number;
  category: 'llm' | 'websocket' | 'route' | 'error' | 'memory' | 'lifecycle';
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Get all stored events
 */
export function getCrashLogs(): CrashLogEvent[] {
  try {
    const stored = localStorage.getItem(CRASH_LOG_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Log an event immediately to localStorage
 */
export function crashLog(
  category: CrashLogEvent['category'],
  message: string,
  data?: Record<string, unknown>
): void {
  try {
    const events = getCrashLogs();
    events.push({
      timestamp: Date.now(),
      category,
      message,
      data,
    });
    // Keep only recent events
    const trimmed = events.slice(-MAX_EVENTS);
    localStorage.setItem(CRASH_LOG_KEY, JSON.stringify(trimmed));
  } catch (e) {
    // If localStorage fails, at least log to console
    console.error('[CrashLogger] Failed to log event:', e);
  }
}

/**
 * Clear all crash logs
 */
export function clearCrashLogs(): void {
  try {
    localStorage.removeItem(CRASH_LOG_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Mark app start - useful for detecting crash loops
 */
export function markAppStart(): void {
  crashLog('lifecycle', '🚀 APP START', {
    url: window.location.href,
    timestamp: Date.now(),
  });
}

/**
 * Mark clean exit
 */
export function markCleanExit(): void {
  crashLog('lifecycle', '✅ CLEAN EXIT');
}

// Auto-mark app start when this module loads
markAppStart();

// Mark clean exit on beforeunload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', markCleanExit);
}
