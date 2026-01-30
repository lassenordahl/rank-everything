/**
 * useEmojiClassifier Hook
 *
 * React hook that provides debounced emoji classification using the local LLM.
 * Shows loading states and handles errors gracefully.
 */

import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { emojiLLM } from '../lib/emojiLLM';

interface EmojiClassifierResult {
  emoji: string | null;
  isClassifying: boolean;
  isModelLoading: boolean;
  modelProgress: number;
  error: string | null;
}

/**
 * Hook to get the current LLM loading state
 */
function useLLMState() {
  return useSyncExternalStore(
    (callback) => emojiLLM.subscribe(callback),
    () => emojiLLM.state,
    () => emojiLLM.state
  );
}

/**
 * Debounced emoji classification hook
 *
 * @param text - The text to classify
 * @param debounceMs - Debounce delay in milliseconds (default: 500ms)
 * @returns Emoji classification result with loading states
 */
export function useEmojiClassifier(text: string, debounceMs: number = 500): EmojiClassifierResult {
  const [emoji, setEmoji] = useState<string | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const llmState = useLLMState();

  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef(false);
  const lastTextRef = useRef('');

  // No initialization needed anymore - simple matcher is always ready
  // Keeping this comment for context on why this effect was removed

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const trimmedText = text.trim();

    // Reset if text is empty or same as last
    if (!trimmedText) {
      setEmoji(null);
      setIsClassifying(false);
      setError(null);
      return;
    }

    // If text hasn't changed meaningfully, skip
    if (trimmedText === lastTextRef.current) {
      return;
    }

    // Set loading state
    setIsClassifying(true);
    setError(null);
    abortRef.current = false;

    // Debounce the classification
    timeoutRef.current = setTimeout(async () => {
      try {
        lastTextRef.current = trimmedText;
        const result = await emojiLLM.classifyEmoji(trimmedText);

        if (!abortRef.current) {
          setEmoji(result);
          setIsClassifying(false);
        }
      } catch (err) {
        if (!abortRef.current) {
          setError(err instanceof Error ? err.message : 'Classification failed');
          setIsClassifying(false);
        }
      }
    }, debounceMs);

    return () => {
      abortRef.current = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, debounceMs]);

  return {
    emoji,
    isClassifying,
    isModelLoading: llmState.state === 'loading' || llmState.state === 'idle',
    modelProgress: llmState.progress,
    error: error || llmState.error,
  };
}

/**
 * Hook to preload the LLM model (now a no-op)
 * Previously loaded ML model in background. Now using simple keyword matching.
 * Kept for API compatibility but does nothing.
 * @param _options - Previously used to skip preload. Now unused but kept for compatibility.
 */
export function usePreloadLLM(_options?: { skip?: boolean }) {
  // No-op: Simple keyword matcher doesn't need preloading
  // Kept for API compatibility with existing code
}
