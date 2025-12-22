/**
 * Optimized Emoji Classification Web Worker
 *
 * Uses pre-computed embeddings for instant emoji matching.
 * The ML model is only loaded lazily when needed for input text embedding.
 *
 * Performance improvements:
 * - Pre-computed embeddings load in ~100-200ms (vs 3+ seconds computing at runtime)
 * - Model loads in background, not blocking emoji matching
 * - Instant classification once embeddings are loaded
 */

import type { FeatureExtractionPipeline } from '@huggingface/transformers';

// Worker message types
export interface WorkerRequest {
  type: 'initialize' | 'classify' | 'getMetrics';
  text?: string;
  id: number;
}

export interface WorkerResponse {
  type: 'progress' | 'ready' | 'error' | 'result' | 'metrics' | 'log';
  progress?: number;
  error?: string;
  emoji?: string;
  id?: number;
  metrics?: PerformanceMetrics;
  logEntry?: {
    level: 'error' | 'warn' | 'info';
    type: string;
    message: string;
    stack?: string;
  };
}

export interface PerformanceMetrics {
  embeddingsLoadTime: number;
  modelLoadTime: number | null;
  totalInitTime: number;
  embeddingCount: number;
  classificationCount: number;
  avgClassificationTime: number;
}

// State
let pipelineInstance: FeatureExtractionPipeline | null = null;
let emojiEmbeddings: Map<string, number[]> = new Map();
let modelLoadPromise: Promise<void> | null = null;

// Performance metrics
const metrics: PerformanceMetrics = {
  embeddingsLoadTime: 0,
  modelLoadTime: null,
  totalInitTime: 0,
  embeddingCount: 0,
  classificationCount: 0,
  avgClassificationTime: 0,
};

let classificationTimes: number[] = [];

// Cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const aVal = a[i] ?? 0;
    const bVal = b[i] ?? 0;
    dotProduct += aVal * bVal;
    normA += aVal * aVal;
    normB += bVal * bVal;
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Load pre-computed embeddings from the bundled JSON file.
 * This is much faster than computing embeddings at runtime.
 */
async function loadPrecomputedEmbeddings(): Promise<void> {
  const startTime = performance.now();

  console.log('[EmojiWorker] Loading pre-computed embeddings...');
  self.postMessage({ type: 'progress', progress: 10 } as WorkerResponse);

  // Dynamic import the embeddings data
  const { default: embeddingsData } = await import('./emojiEmbeddings.json');

  self.postMessage({ type: 'progress', progress: 50 } as WorkerResponse);

  // Decode base64 embeddings
  const binary = atob(embeddingsData.embeddingsBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const floats = new Float32Array(bytes.buffer);

  self.postMessage({ type: 'progress', progress: 80 } as WorkerResponse);

  // Build the embeddings map
  const embeddingDim = embeddingsData.embeddingDim;
  for (let i = 0; i < embeddingsData.count; i++) {
    const start = i * embeddingDim;
    const end = start + embeddingDim;
    const emoji = embeddingsData.emojis[i];
    // Filter out text labels like " adult" or keys mixed with text
    // Real emojis generally won't match [a-zA-Z]
    if (emoji && !/[a-zA-Z]/.test(emoji)) {
      emojiEmbeddings.set(emoji, Array.from(floats.slice(start, end)));
    }
  }

  const loadTime = performance.now() - startTime;
  metrics.embeddingsLoadTime = loadTime;
  metrics.embeddingCount = emojiEmbeddings.size;

  console.log(
    `[EmojiWorker] Loaded ${emojiEmbeddings.size} pre-computed embeddings in ${loadTime.toFixed(0)}ms`
  );

  self.postMessage({ type: 'progress', progress: 100 } as WorkerResponse);
}

/**
 * Lazily load the ML model for input text embedding.
 * This is only needed when classifying - not for initialization.
 */
async function ensureModelLoaded(): Promise<void> {
  if (pipelineInstance) return;

  if (modelLoadPromise) {
    await modelLoadPromise;
    return;
  }

  const startTime = performance.now();

  console.log('[EmojiWorker] Lazy-loading model for classification...');

  modelLoadPromise = (async () => {
    const { pipeline, env } = await import('@huggingface/transformers');

    env.allowLocalModels = false;
    env.useBrowserCache = true;

    // Use single-threaded WASM to reduce bundle size (14MB vs 21MB)
    env.backends = {
      onnx: {
        wasm: {
          numThreads: 1, // Force single-threaded execution
        },
      },
    };

    const modelId = 'Xenova/all-MiniLM-L6-v2';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pipelineInstance = (await (pipeline as any)('feature-extraction', modelId, {
      // We don't report progress here since this happens in background
      device: 'wasm', // Explicitly use WASM backend (single-threaded)
    })) as FeatureExtractionPipeline;

    const loadTime = performance.now() - startTime;
    metrics.modelLoadTime = loadTime;
    console.log(`[EmojiWorker] Model loaded in ${loadTime.toFixed(0)}ms`);
  })();

  await modelLoadPromise;
}

/**
 * Classify text to find the best matching emoji.
 */
async function classifyEmoji(text: string): Promise<string> {
  const startTime = performance.now();

  // Ensure model is loaded for text embedding
  await ensureModelLoaded();

  if (!pipelineInstance) {
    throw new Error('Model not loaded');
  }

  // Get embedding for input text
  const result = await pipelineInstance(text, {
    pooling: 'mean',
    normalize: true,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputEmbedding = Array.from((result as any).data || (result as any)[0]?.data || []);

  if (inputEmbedding.length === 0) {
    console.warn('[EmojiWorker] Empty embedding for:', text);
    return '🎲';
  }

  // Find most similar emoji
  let bestEmoji = '🎲';
  let bestScore = -Infinity;

  for (const [emoji, emojiEmbed] of emojiEmbeddings.entries()) {
    const score = cosineSimilarity(inputEmbedding as number[], emojiEmbed);
    if (score > bestScore) {
      bestScore = score;
      bestEmoji = emoji;
    }
  }

  const classificationTime = performance.now() - startTime;
  classificationTimes.push(classificationTime);
  metrics.classificationCount++;
  metrics.avgClassificationTime =
    classificationTimes.reduce((a, b) => a + b, 0) / classificationTimes.length;

  console.log(
    '[EmojiWorker] Input:',
    text,
    '→ Emoji:',
    bestEmoji,
    '(score:',
    bestScore.toFixed(3),
    ', time:',
    classificationTime.toFixed(0),
    'ms)'
  );

  return bestEmoji;
}

// Handle messages from the main thread
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { type, text, id } = event.data;

  try {
    if (type === 'initialize') {
      const startTime = performance.now();

      // Only load pre-computed embeddings - model loads lazily on first classify
      await loadPrecomputedEmbeddings();

      metrics.totalInitTime = performance.now() - startTime;

      // Start loading model in background (optional, for faster first classification)
      // We do this after signaling ready so the UI isn't blocked
      setTimeout(() => {
        ensureModelLoaded().catch((err) => {
          console.warn('[EmojiWorker] Background model load failed:', err);
        });
      }, 100);

      self.postMessage({ type: 'ready', id } as WorkerResponse);
    } else if (type === 'classify' && text) {
      const emoji = await classifyEmoji(text);
      self.postMessage({ type: 'result', emoji, id } as WorkerResponse);
    } else if (type === 'getMetrics') {
      self.postMessage({ type: 'metrics', metrics, id } as WorkerResponse);
    }
  } catch (error) {
    console.error('[EmojiWorker] Error:', error);

    // Send log to main thread
    self.postMessage({
      type: 'log',
      logEntry: {
        level: 'error',
        type: 'webgpu',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    } as WorkerResponse);

    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      id,
    } as WorkerResponse);
  }
};

// Signal that the worker is ready to receive messages
self.postMessage({ type: 'progress', progress: 0 } as WorkerResponse);
