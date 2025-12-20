/**
 * Emoji Classification Web Worker
 *
 * Runs the transformers.js model loading and inference completely off the main thread.
 * This prevents any UI blocking during model download, initialization, or classification.
 */

import type { FeatureExtractionPipeline } from '@huggingface/transformers';

// Worker message types
export interface WorkerRequest {
  type: 'initialize' | 'classify';
  text?: string;
  id: number;
}

export interface WorkerResponse {
  type: 'progress' | 'ready' | 'error' | 'result';
  progress?: number;
  error?: string;
  emoji?: string;
  id?: number;
}

// Pre-defined emoji list with descriptions for matching
const EMOJI_DATABASE: Array<{ emoji: string; keywords: string }> = [
  // Food & Drink
  { emoji: '🍎', keywords: 'apple red fruit healthy' },
  { emoji: '🍊', keywords: 'orange citrus fruit tangerine' },
  { emoji: '🍋', keywords: 'lemon yellow citrus sour' },
  { emoji: '🍌', keywords: 'banana yellow fruit tropical' },
  { emoji: '🍇', keywords: 'grapes purple fruit wine' },
  { emoji: '🍓', keywords: 'strawberry red berry fruit sweet' },
  { emoji: '🍕', keywords: 'pizza food italian cheese pepperoni' },
  { emoji: '🍔', keywords: 'hamburger burger food beef fast food' },
  { emoji: '🌮', keywords: 'taco mexican food' },
  { emoji: '🍜', keywords: 'noodles ramen soup asian food' },
  { emoji: '🍦', keywords: 'ice cream dessert sweet cold' },
  { emoji: '🍪', keywords: 'cookie biscuit dessert sweet' },
  { emoji: '🎂', keywords: 'birthday cake celebration dessert' },
  { emoji: '☕', keywords: 'coffee hot drink caffeine morning' },
  { emoji: '🍺', keywords: 'beer alcohol drink bar pub' },
  { emoji: '🍷', keywords: 'wine red wine alcohol drink' },

  // Animals
  { emoji: '🐶', keywords: 'dog puppy pet animal cute' },
  { emoji: '🐱', keywords: 'cat kitten pet animal cute' },
  { emoji: '🐭', keywords: 'mouse rat rodent animal' },
  { emoji: '🐰', keywords: 'rabbit bunny animal cute' },
  { emoji: '🦊', keywords: 'fox animal clever orange' },
  { emoji: '🐻', keywords: 'bear animal forest brown' },
  { emoji: '🐼', keywords: 'panda bear animal cute china' },
  { emoji: '🐨', keywords: 'koala animal australia cute' },
  { emoji: '🦁', keywords: 'lion animal king jungle safari' },
  { emoji: '🐯', keywords: 'tiger animal stripes jungle' },
  { emoji: '🐮', keywords: 'cow farm animal milk' },
  { emoji: '🐷', keywords: 'pig farm animal pink' },
  { emoji: '🐸', keywords: 'frog animal green amphibian' },
  { emoji: '🐵', keywords: 'monkey animal primate jungle' },
  { emoji: '🐔', keywords: 'chicken bird farm animal' },
  { emoji: '🦅', keywords: 'eagle bird flying freedom' },
  { emoji: '🦋', keywords: 'butterfly insect beautiful colorful' },
  { emoji: '🐝', keywords: 'bee insect honey buzz' },
  { emoji: '🐠', keywords: 'fish ocean sea swimming' },
  { emoji: '🦈', keywords: 'shark ocean predator dangerous' },
  { emoji: '🐳', keywords: 'whale ocean large mammal' },
  { emoji: '🦀', keywords: 'crab ocean seafood beach' },
  { emoji: '🐍', keywords: 'snake reptile danger slither' },
  { emoji: '🦖', keywords: 'dinosaur prehistoric extinct t-rex' },

  // Nature & Weather
  { emoji: '🌸', keywords: 'flower cherry blossom spring pink' },
  { emoji: '🌻', keywords: 'sunflower flower yellow summer' },
  { emoji: '🌹', keywords: 'rose flower red love romantic' },
  { emoji: '🌲', keywords: 'tree evergreen forest nature' },
  { emoji: '🌴', keywords: 'palm tree tropical beach island' },
  { emoji: '🌊', keywords: 'wave ocean sea water surf' },
  { emoji: '⛰️', keywords: 'mountain nature hiking tall' },
  { emoji: '🌈', keywords: 'rainbow colorful weather beautiful' },
  { emoji: '☀️', keywords: 'sun sunny weather hot bright' },
  { emoji: '🌙', keywords: 'moon night dark crescent' },
  { emoji: '⭐', keywords: 'star night sky shining' },
  { emoji: '❄️', keywords: 'snowflake snow winter cold' },
  { emoji: '🔥', keywords: 'fire hot flame burning' },
  { emoji: '💧', keywords: 'water drop rain liquid' },
  { emoji: '⚡', keywords: 'lightning electric storm power' },

  // Activities & Sports
  { emoji: '⚽', keywords: 'soccer football sport ball' },
  { emoji: '🏀', keywords: 'basketball sport ball game' },
  { emoji: '🏈', keywords: 'football american sport ball' },
  { emoji: '⚾', keywords: 'baseball sport ball game' },
  { emoji: '🎾', keywords: 'tennis sport ball racket' },
  { emoji: '🏊', keywords: 'swimming sport water pool' },
  { emoji: '🚴', keywords: 'cycling bicycle sport biking' },
  { emoji: '🎮', keywords: 'video game gaming controller play' },
  { emoji: '🎬', keywords: 'movie film cinema entertainment' },
  { emoji: '🎵', keywords: 'music note song melody' },
  { emoji: '🎸', keywords: 'guitar music instrument rock' },
  { emoji: '🎹', keywords: 'piano keyboard music instrument' },
  { emoji: '📚', keywords: 'books reading education study' },
  { emoji: '🎨', keywords: 'art painting creative palette' },
  { emoji: '📷', keywords: 'camera photo photography picture' },
  { emoji: '✈️', keywords: 'airplane travel flying vacation' },
  { emoji: '🚗', keywords: 'car driving automobile vehicle' },
  { emoji: '🚀', keywords: 'rocket space launch fast' },

  // Objects
  { emoji: '💻', keywords: 'computer laptop technology work' },
  { emoji: '📱', keywords: 'phone mobile smartphone device' },
  { emoji: '💡', keywords: 'light bulb idea bright innovation' },
  { emoji: '🔑', keywords: 'key unlock security access' },
  { emoji: '💰', keywords: 'money cash wealth rich' },
  { emoji: '💎', keywords: 'diamond gem jewel precious' },
  { emoji: '🎁', keywords: 'gift present surprise birthday' },
  { emoji: '🏠', keywords: 'house home building residence' },
  { emoji: '⏰', keywords: 'clock time alarm morning' },

  // Emotions & Symbols
  { emoji: '❤️', keywords: 'heart love romantic affection' },
  { emoji: '💔', keywords: 'broken heart sad heartbreak' },
  { emoji: '😀', keywords: 'happy smile joy excited' },
  { emoji: '😂', keywords: 'laughing funny hilarious lol' },
  { emoji: '😢', keywords: 'sad crying tears upset' },
  { emoji: '😡', keywords: 'angry mad furious rage' },
  { emoji: '😱', keywords: 'scared fear horror terrified' },
  { emoji: '🤔', keywords: 'thinking wondering pondering hmm' },
  { emoji: '😴', keywords: 'sleep tired sleeping zzz' },
  { emoji: '🤢', keywords: 'sick nauseous gross disgusting' },
  { emoji: '👍', keywords: 'thumbs up good approve yes' },
  { emoji: '👎', keywords: 'thumbs down bad disapprove no' },
  { emoji: '✅', keywords: 'check yes correct done complete' },
  { emoji: '❌', keywords: 'cross no wrong cancel' },
  { emoji: '💯', keywords: 'hundred perfect score excellent' },
  { emoji: '🙏', keywords: 'pray thanks please grateful' },
  { emoji: '💪', keywords: 'strong muscle power strength workout' },
  { emoji: '👋', keywords: 'wave hello goodbye greeting' },
  { emoji: '🎉', keywords: 'party celebration confetti birthday fun' },
  { emoji: '🏆', keywords: 'trophy winner champion success' },
];

// Model state
let pipelineInstance: FeatureExtractionPipeline | null = null;
const emojiEmbeddings = new Map<string, number[]>();

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

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

async function loadModel(): Promise<void> {
  // Dynamic import - this is where the magic happens
  // The transformers library is only loaded when this function runs in the worker
  const { pipeline, env } = await import('@huggingface/transformers');

  // Configure for browser environment
  env.allowLocalModels = false;
  env.useBrowserCache = true;

  const modelId = 'Xenova/all-MiniLM-L6-v2';

  console.log('[EmojiWorker] Loading embedding model:', modelId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pipelineInstance = (await (pipeline as any)('feature-extraction', modelId, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    progress_callback: (progress: any) => {
      if (typeof progress?.progress === 'number') {
        // Model loading is 0-80%, embedding computation is 80-100%
        self.postMessage({
          type: 'progress',
          progress: Math.round(progress.progress * 80),
        } as WorkerResponse);
      }
    },
  })) as FeatureExtractionPipeline;

  console.log('[EmojiWorker] Model loaded, computing emoji embeddings...');
  self.postMessage({ type: 'progress', progress: 80 } as WorkerResponse);

  // Pre-compute embeddings for all emoji keywords
  const keywords = EMOJI_DATABASE.map((e) => e.keywords);
  const batchSize = 20;

  for (let i = 0; i < keywords.length; i += batchSize) {
    const batch = keywords.slice(i, i + batchSize);
    const embeddings = await pipelineInstance(batch, {
      pooling: 'mean',
      normalize: true,
    });

    // Store embeddings
    for (let j = 0; j < batch.length; j++) {
      const emojiEntry = EMOJI_DATABASE[i + j];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const embedding = (embeddings as any)[j]?.data || (embeddings as any).data;
      if (embedding && emojiEntry) {
        emojiEmbeddings.set(emojiEntry.emoji, Array.from(embedding));
      }
    }

    // Update progress
    const progressPercent = 80 + (i / keywords.length) * 20;
    self.postMessage({ type: 'progress', progress: Math.round(progressPercent) } as WorkerResponse);
  }

  console.log('[EmojiWorker] Ready! Cached', emojiEmbeddings.size, 'emoji embeddings');
}

async function classifyEmoji(text: string): Promise<string> {
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

  console.log('[EmojiWorker] Input:', text, '→ Emoji:', bestEmoji, '(score:', bestScore.toFixed(3), ')');

  return bestEmoji;
}

// Handle messages from the main thread
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { type, text, id } = event.data;

  try {
    if (type === 'initialize') {
      await loadModel();
      self.postMessage({ type: 'ready', id } as WorkerResponse);
    } else if (type === 'classify' && text) {
      const emoji = await classifyEmoji(text);
      self.postMessage({ type: 'result', emoji, id } as WorkerResponse);
    }
  } catch (error) {
    console.error('[EmojiWorker] Error:', error);
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      id,
    } as WorkerResponse);
  }
};

// Signal that the worker is ready to receive messages
self.postMessage({ type: 'progress', progress: 0 } as WorkerResponse);
