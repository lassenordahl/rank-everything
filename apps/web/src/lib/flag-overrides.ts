import { FeatureFlag } from './flags';

/**
 * Feature Flag Overrides
 *
 * Use this file to manually toggle features on/off during development or for specific environment builds.
 * These overrides take precedence over the defaults in flags.ts but can be overridden by test-specific contexts.
 */
export const FLAG_OVERRIDES: Partial<Record<FeatureFlag, boolean>> = {
  // Disable share results feature by default as requested
  share_results: false,
};
