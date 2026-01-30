/**
 * Feature Flags
 *
 * Simple feature flag system for A/B testing and debugging.
 * Flags can be overridden via localStorage.
 */

export interface FeatureFlags {
  // Emoji classification features
  enableEmojiLLM: boolean; // Use local ML model for emoji classification
  enableEmojiServer: boolean; // Fall back to server-side emoji classification

  // Performance flags
  enablePerformanceMonitoring: boolean; // Track memory and performance
  logMemoryUsage: boolean; // Console log memory snapshots
}

const DEFAULT_FLAGS: FeatureFlags = {
  // Emoji features - default to server-side for better mobile performance
  enableEmojiLLM: false, // Disabled by default - causes mobile crashes
  enableEmojiServer: true, // Fallback to server

  // Performance monitoring
  enablePerformanceMonitoring: true,
  logMemoryUsage: false, // Only enable for debugging
};

class FeatureFlagManager {
  private flags: FeatureFlags;

  constructor() {
    this.flags = this.loadFlags();
    this.exposeToWindow();
  }

  private loadFlags(): FeatureFlags {
    try {
      const stored = localStorage.getItem('feature_flags');
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_FLAGS, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load feature flags from localStorage', e);
    }
    return { ...DEFAULT_FLAGS };
  }

  private saveFlags() {
    try {
      localStorage.setItem('feature_flags', JSON.stringify(this.flags));
    } catch (e) {
      console.warn('Failed to save feature flags', e);
    }
  }

  get(flag: keyof FeatureFlags): boolean {
    return this.flags[flag];
  }

  set(flag: keyof FeatureFlags, value: boolean) {
    this.flags[flag] = value;
    this.saveFlags();
    console.log(`[FeatureFlags] ${flag} = ${value}`);
  }

  toggle(flag: keyof FeatureFlags) {
    this.set(flag, !this.flags[flag]);
  }

  getAll(): FeatureFlags {
    return { ...this.flags };
  }

  reset() {
    this.flags = { ...DEFAULT_FLAGS };
    this.saveFlags();
    console.log('[FeatureFlags] Reset to defaults');
  }

  private exposeToWindow() {
    if (typeof window !== 'undefined') {
      interface WindowFeatureFlags {
        get: (flag: keyof FeatureFlags) => boolean;
        set: (flag: keyof FeatureFlags, value: boolean) => void;
        toggle: (flag: keyof FeatureFlags) => void;
        getAll: () => FeatureFlags;
        reset: () => void;
        help: () => void;
      }
      (window as unknown as { featureFlags?: WindowFeatureFlags }).featureFlags = {
        get: (flag: keyof FeatureFlags) => this.get(flag),
        set: (flag: keyof FeatureFlags, value: boolean) => this.set(flag, value),
        toggle: (flag: keyof FeatureFlags) => this.toggle(flag),
        getAll: () => this.getAll(),
        reset: () => this.reset(),
        help: () => {
          console.log('Available feature flags:');
          console.log('- enableEmojiLLM: Use local ML model for emoji classification');
          console.log('- enableEmojiServer: Fall back to server-side emoji');
          console.log('- enablePerformanceMonitoring: Track memory and performance');
          console.log('- logMemoryUsage: Console log memory snapshots');
          console.log('\nUsage:');
          console.log('  featureFlags.set("enableEmojiLLM", true)');
          console.log('  featureFlags.toggle("enableEmojiLLM")');
          console.log('  featureFlags.getAll()');
          console.log('  featureFlags.reset()');
        },
      };
    }
  }
}

export const featureFlags = new FeatureFlagManager();

// Log current flags on startup
console.log('[FeatureFlags] Current flags:', featureFlags.getAll());
console.log('[FeatureFlags] Type "featureFlags.help()" in console for commands');
