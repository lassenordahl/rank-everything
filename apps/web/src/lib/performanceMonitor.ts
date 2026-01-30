/**
 * Performance and Memory Monitoring
 *
 * Tracks memory usage, performance metrics, and crashes to help debug mobile issues.
 */

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceSnapshot {
  timestamp: number;
  url: string;
  memory?: {
    usedMB: number;
    totalMB: number;
    limitMB: number;
    percentUsed: number;
  };
  loadTime?: number;
  userAgent: string;
}

class PerformanceMonitor {
  private snapshots: PerformanceSnapshot[] = [];
  private startTime = Date.now();

  constructor() {
    // Auto-capture on page load
    this.captureSnapshot('init');

    // Capture before unload to catch crashes
    window.addEventListener('beforeunload', () => {
      this.captureSnapshot('unload');
      this.flushToStorage();
    });

    // Capture periodically (every 30s)
    setInterval(() => this.captureSnapshot('periodic'), 30000);

    // Listen for errors
    window.addEventListener('error', (event) => {
      this.logError('error', event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.logError('unhandledrejection', event.reason);
    });
  }

  captureSnapshot(label: string): PerformanceSnapshot {
    const snapshot: PerformanceSnapshot = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    // Chrome/Edge provide memory info
    if ('memory' in performance && (performance as unknown as { memory?: MemoryInfo }).memory) {
      const mem = (performance as unknown as { memory: MemoryInfo }).memory;
      snapshot.memory = {
        usedMB: Math.round(mem.usedJSHeapSize / 1024 / 1024),
        totalMB: Math.round(mem.totalJSHeapSize / 1024 / 1024),
        limitMB: Math.round(mem.jsHeapSizeLimit / 1024 / 1024),
        percentUsed: Math.round((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100),
      };
    }

    if (performance.timing) {
      snapshot.loadTime = Date.now() - performance.timing.navigationStart;
    }

    this.snapshots.push(snapshot);

    console.log(`[PerformanceMonitor] ${label}:`, snapshot);

    // Keep only last 50 snapshots
    if (this.snapshots.length > 50) {
      this.snapshots = this.snapshots.slice(-50);
    }

    return snapshot;
  }

  logError(type: string, error: unknown) {
    const errorInfo = {
      type,
      message: (error as { message?: string })?.message || String(error),
      stack: (error as { stack?: string })?.stack,
      timestamp: Date.now(),
      memory: this.getMemoryUsage(),
    };

    console.error('[PerformanceMonitor] Error:', errorInfo);

    // Store in localStorage for post-crash analysis
    try {
      const errors = this.getStoredErrors();
      errors.push(errorInfo);
      localStorage.setItem('perf_errors', JSON.stringify(errors.slice(-20)));
    } catch (e) {
      console.warn('Failed to store error', e);
    }
  }

  getMemoryUsage(): { usedMB: number; percentUsed: number } | null {
    if ('memory' in performance && (performance as unknown as { memory?: MemoryInfo }).memory) {
      const mem = (performance as unknown as { memory: MemoryInfo }).memory;
      return {
        usedMB: Math.round(mem.usedJSHeapSize / 1024 / 1024),
        percentUsed: Math.round((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100),
      };
    }
    return null;
  }

  getStoredErrors(): unknown[] {
    try {
      const stored = localStorage.getItem('perf_errors');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  flushToStorage() {
    try {
      localStorage.setItem('perf_snapshots', JSON.stringify(this.snapshots.slice(-20)));
    } catch (e) {
      console.warn('Failed to flush performance data', e);
    }
  }

  /**
   * Get a performance report for debugging
   */
  getReport(): {
    currentMemory: { usedMB: number; percentUsed: number } | null;
    recentSnapshots: PerformanceSnapshot[];
    recentErrors: unknown[];
    uptime: number;
  } {
    return {
      currentMemory: this.getMemoryUsage(),
      recentSnapshots: this.snapshots.slice(-10),
      recentErrors: this.getStoredErrors(),
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Print a formatted report to console
   */
  printReport() {
    const report = this.getReport();
    console.log('=== PERFORMANCE REPORT ===');
    console.log('Memory:', report.currentMemory);
    console.log('Uptime:', Math.round(report.uptime / 1000), 'seconds');
    console.log('Recent Snapshots:', report.recentSnapshots);
    console.log('Recent Errors:', report.recentErrors);
    console.log('========================');
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Expose to window for debugging in console
if (typeof window !== 'undefined') {
  (window as unknown as { perfMonitor?: PerformanceMonitor }).perfMonitor = performanceMonitor;
}
