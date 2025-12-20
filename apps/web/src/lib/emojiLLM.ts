/**
 * Emoji LLM Service - Web Worker Wrapper
 *
 * Wraps the emojiWorker to provide a clean promise-based API for consumers.
 * All heavy lifting (model loading, inference) happens in the worker thread.
 */

import type { WorkerRequest, WorkerResponse } from './emojiWorker';
import EmojiWorker from './emojiWorker?worker';

// Define the state types to match what consumers expect
type LoadingState = 'idle' | 'loading' | 'ready' | 'error';

export interface EmojiLLMState {
  state: LoadingState;
  progress: number;
  error: string | null;
}

class EmojiLLM {
  private worker: Worker | null = null;
  private loadingPromise: Promise<void> | null = null;
  private initResolver: (() => void) | null = null;

  private currentState: EmojiLLMState = {
    state: 'idle',
    progress: 0,
    error: null,
  };
  private listeners: Set<(state: EmojiLLMState) => void> = new Set();

  // Pending request management
  private pendingRequests: Map<
    number,
    { resolve: (value: string) => void; reject: (reason: unknown) => void }
  > = new Map();
  private nextRequestId = 0;

  constructor() {
    // We don't initialize the worker immediately to allow for lazy loading
  }

  subscribe(listener: (state: EmojiLLMState) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => this.listeners.delete(listener);
  }

  private setState(update: Partial<EmojiLLMState>) {
    this.currentState = { ...this.currentState, ...update };
    this.listeners.forEach((l) => l(this.currentState));
  }

  async initialize(): Promise<void> {
    if (this.loadingPromise) return this.loadingPromise;
    if (this.currentState.state === 'ready') return;

    this.loadingPromise = this.initWorker();
    return this.loadingPromise;
  }

  private initWorker(): Promise<void> {
    this.setState({ state: 'loading', progress: 0, error: null });
    console.log('[EmojiLLM] Initializing worker...');

    return new Promise((resolve, reject) => {
      try {
        this.worker = new EmojiWorker();
        this.initResolver = resolve;

        this.worker.onmessage = this.handleMessage.bind(this);

        // Keep worker alive but let errors bubble up if explicit initialization fails
        this.worker.postMessage({
          type: 'initialize',
          id: this.nextRequestId++,
        } as WorkerRequest);
      } catch (error) {
        console.error('[EmojiLLM] Failed to initialize worker:', error);
        const errorMsg = error instanceof Error ? error.message : 'Failed to initialize worker';
        this.setState({
          state: 'error',
          error: errorMsg,
        });
        reject(error);
      }
    });
  }

  private handleMessage(event: MessageEvent<WorkerResponse>) {
    const { type, progress, error, emoji, id } = event.data;

    switch (type) {
      case 'progress':
        if (typeof progress === 'number') {
          this.setState({ progress });
        }
        break;

      case 'ready':
        console.log('[EmojiLLM] Worker ready!');
        this.setState({ state: 'ready', progress: 100 });
        if (this.initResolver) {
          this.initResolver();
          this.initResolver = null;
        }
        break;

      case 'error':
        console.error('[EmojiLLM] Worker error:', error);
        if (id !== undefined && this.pendingRequests.has(id)) {
          this.pendingRequests.get(id)?.reject(new Error(error));
          this.pendingRequests.delete(id);
        } else {
          // Global error or init error
          this.setState({
            state: 'error',
            error: error || 'Unknown worker error',
          });
        }
        break;

      case 'result':
        if (id !== undefined && this.pendingRequests.has(id)) {
          this.pendingRequests.get(id)?.resolve(emoji || '🎲');
          this.pendingRequests.delete(id);
        }
        break;
    }
  }

  async classifyEmoji(text: string): Promise<string> {
    if (this.currentState.state === 'error') {
      console.warn('[EmojiLLM] Cannot classify, worker in error state');
      return '🎲';
    }

    if (!this.worker || this.currentState.state === 'idle') {
      await this.initialize();
    }

    // If logic above failed to init worker or we are still loading, wait for ready
    if (this.currentState.state === 'loading') {
      // Wait for ready state by polling or just hooking into the promise if we could
      // For simplicity, we'll just wait for the loadingPromise we triggered
      if (this.loadingPromise) {
        try {
          await this.loadingPromise;
        } catch (e) {
          console.error('Worker initialization failed', e);
          return '🎲';
        }
      }
    }

    if (!this.worker) {
      return '🎲';
    }

    return new Promise((resolve, reject) => {
      const id = this.nextRequestId++;
      this.pendingRequests.set(id, { resolve, reject });

      if (this.worker) {
        this.worker.postMessage({
          type: 'classify',
          text,
          id,
        } as WorkerRequest);
      }

      // Timeout after 10s to avoid hanging promises
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          resolve('🎲'); // Fallback instead of rejecting to keep UI smooth
          console.warn('[EmojiLLM] Classification timed out');
        }
      }, 10000);
    });
  }

  get ready(): boolean {
    return this.currentState.state === 'ready';
  }

  get state(): EmojiLLMState {
    return this.currentState;
  }
}

export const emojiLLM = new EmojiLLM();
