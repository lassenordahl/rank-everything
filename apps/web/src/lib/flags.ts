/**
 * Feature Flags Configuration
 *
 * Defines available feature flags and their default states.
 */

export type FeatureFlag = 'share_results' | 'game_list_size_setting';

// Default state for all flags (assumed true unless disabled)
export const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
  share_results: true,
  game_list_size_setting: true,
};

// List of flags that are currently DISABLED in production/default
export const DISABLED_FLAGS: FeatureFlag[] = [
  'share_results', // Creating share images is currently buggy or unwanted
];

/**
 * Resolves the state of a feature flag.
 *
 * @param flag The flag to check
 * @param overrides Optional overrides (e.g. from local storage or test context)
 * @returns boolean True if enabled
 */
export function isFeatureEnabled(
  flag: FeatureFlag,
  overrides?: Partial<Record<FeatureFlag, boolean>>
): boolean {
  // 1. Check overrides first
  if (overrides && flag in overrides) {
    return overrides[flag]!;
  }

  // 2. Check disabled list
  if (DISABLED_FLAGS.includes(flag)) {
    return false;
  }

  // 3. Fallback to default (usually true)
  return DEFAULT_FLAGS[flag] ?? true;
}
