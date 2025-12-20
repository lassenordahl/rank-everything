import { createContext, useContext, useMemo, ReactNode } from 'react';
import { FeatureFlag, isFeatureEnabled } from '../lib/flags';

interface FeatureFlagContextType {
  isEnabled: (flag: FeatureFlag) => boolean;
  flags: Partial<Record<FeatureFlag, boolean>>;
}

const FeatureFlagContext = createContext<FeatureFlagContextType | null>(null);

export interface FeatureFlagProviderProps {
  children: ReactNode;
  /**
   * Optional manual overrides for flags.
   * Useful for testing or enabling features via query params/local storage.
   */
  overrides?: Partial<Record<FeatureFlag, boolean>>;
}

export function FeatureFlagProvider({ children, overrides = {} }: FeatureFlagProviderProps) {
  const value = useMemo(() => {
    return {
      isEnabled: (flag: FeatureFlag) => isFeatureEnabled(flag, overrides),
      flags: overrides,
    };
  }, [overrides]);

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

/**
 * Hook to check if a feature flag is enabled.
 *
 * @example
 * const showShare = useFeatureFlag('share_results');
 */
export function useFeatureFlag(flag: FeatureFlag): boolean {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    // Fallback if used outside provider (should shouldn't happen in app, but maybe in isolated tests)
    // Default to strict checking if no context available
    return isFeatureEnabled(flag);
  }
  return context.isEnabled(flag);
}
