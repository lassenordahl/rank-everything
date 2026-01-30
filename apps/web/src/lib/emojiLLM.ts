/**
 * Emoji Classification Service - Simple Keyword-Based Matcher
 *
 * Provides a clean promise-based API for emoji classification without using
 * WebAssembly or ML models. This prevents memory crashes on browsers while
 * still providing fun, relevant emoji assignments based on keyword matching.
 */

import { matchEmoji } from './simpleEmojiMatcher';

// Define the state types to match what consumers expect
type LoadingState = 'idle' | 'loading' | 'ready' | 'error';

export interface EmojiLLMState {
  state: LoadingState;
  progress: number;
  error: string | null;
}

class EmojiLLM {
  private currentState: EmojiLLMState = {
    state: 'ready', // Always ready since there's no loading needed
    progress: 100,
    error: null,
  };
  private listeners: Set<(state: EmojiLLMState) => void> = new Set();

  subscribe(listener: (state: EmojiLLMState) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => this.listeners.delete(listener);
  }

  async initialize(): Promise<void> {
    // No initialization needed for simple keyword matching
    // This method exists to maintain API compatibility
    return Promise.resolve();
  }

  async classifyEmoji(text: string): Promise<string> {
    // Use simple keyword matching (synchronous, but wrapped in Promise for API compatibility)
    return Promise.resolve(matchEmoji(text));
  }

  get ready(): boolean {
    return true; // Always ready
  }

  get state(): EmojiLLMState {
    return this.currentState;
  }

  get initTime(): number | null {
    return 0; // Instant initialization
  }
}

export const emojiLLM = new EmojiLLM();
