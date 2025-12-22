import { ClientLogEntry } from '@rank-everything/shared-types';

type LogEntry = Omit<ClientLogEntry, 'id'>;

class LoggingService {
  private queue: LogEntry[] = [];
  private sessionId: string;
  private isProcessing = false;

  // URL to API worker - determine based on environment
  private get apiUrl() {
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
    // Production Worker URL
    if (import.meta.env.PROD) {
      return 'https://rank-everything-api.lasseanordahl.workers.dev';
    }
    // Local dev
    return 'http://localhost:8787';
  }

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    // Flush every 5 seconds
    setInterval(() => this.flush(), 5000);

    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flush());

    // Log session start
    this.log({
      level: 'info',
      type: 'console',
      message: 'Session started',
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
  }

  private getOrCreateSessionId(): string {
    const existing = sessionStorage.getItem('logging_session_id');
    if (existing) return existing;

    const newId = crypto.randomUUID();
    sessionStorage.setItem('logging_session_id', newId);
    return newId;
  }

  log(entry: Omit<LogEntry, 'sessionId'>): void {
    const fullEntry: LogEntry = {
      ...entry,
      sessionId: this.sessionId,
    };

    this.queue.push(fullEntry);

    // Immediate flush for errors to ensure capture before potential crash
    if (entry.level === 'error') {
      this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0 || this.isProcessing) return;

    this.isProcessing = true;
    const logsToFlush = [...this.queue];
    this.queue = [];

    try {
      await fetch(`${this.apiUrl}/api/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: logsToFlush }),
        // optimize for reliability on unload
        keepalive: true,
      });
    } catch (e) {
      console.error('[LoggingService] Failed to flush logs:', e);
      // Re-queue on failure, but cap at 100 to prevent memory leak
      if (this.queue.length < 100) {
        this.queue.unshift(...logsToFlush);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  // Force manual flush
  async forceFlush(): Promise<void> {
    await this.flush();
  }
}

export const loggingService = new LoggingService();
