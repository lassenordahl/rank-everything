/**
 * useHaptics Hook
 *
 * Thin wrapper around web-haptics for consistent haptic feedback across the app.
 * Silently no-ops on unsupported platforms (desktop browsers).
 */

import { useWebHaptics } from 'web-haptics/react';

export function useHaptics() {
  const { trigger } = useWebHaptics();
  return { trigger };
}
