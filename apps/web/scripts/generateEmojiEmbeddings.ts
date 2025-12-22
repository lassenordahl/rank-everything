/**
 * Pre-compute Emoji Embeddings Script
 *
 * This script generates embeddings for all emojis using the same model
 * used at runtime (Xenova/all-MiniLM-L6-v2). The embeddings are saved
 * in a binary format for fast loading.
 *
 * Run with: npx tsx scripts/generateEmojiEmbeddings.ts
 */

import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface EmojiEntry {
  emoji: string;
  keywords: string;
}

interface EmbeddingsOutput {
  version: number;
  modelId: string;
  embeddingDim: number;
  count: number;
  emojis: string[];
  // Embeddings stored as base64-encoded Float32Array
  embeddingsBase64: string;
}

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIM = 384; // MiniLM-L6-v2 produces 384-dim embeddings
const BATCH_SIZE = 32;

async function main() {
  console.log('🚀 Starting emoji embedding pre-computation...\n');
  const startTime = performance.now();

  // Load emoji data
  const emojiDataPath = path.join(__dirname, '../src/lib/emojiData.json');
  const emojiData: EmojiEntry[] = JSON.parse(fs.readFileSync(emojiDataPath, 'utf-8'));
  console.log(`📊 Loaded ${emojiData.length} emoji entries\n`);

  // Initialize the model
  console.log(`🤖 Loading model: ${MODEL_ID}`);
  const modelLoadStart = performance.now();

  const extractor = (await pipeline('feature-extraction', MODEL_ID, {
    // @ts-expect-error - progress_callback types are not fully defined
    progress_callback: (progress: { progress?: number; status?: string }) => {
      if (progress.progress !== undefined) {
        process.stdout.write(`\r   Model loading: ${Math.round(progress.progress)}%`);
      }
    },
  })) as FeatureExtractionPipeline;

  const modelLoadTime = performance.now() - modelLoadStart;
  console.log(`\n✅ Model loaded in ${(modelLoadTime / 1000).toFixed(2)}s\n`);

  // Extract keywords for embedding
  const keywords = emojiData.map((e) => e.keywords);
  const emojis = emojiData.map((e) => e.emoji);

  // Compute embeddings in batches
  console.log(`🔢 Computing embeddings for ${keywords.length} entries...`);
  const embeddingStart = performance.now();

  const allEmbeddings: number[][] = [];

  for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
    const batch = keywords.slice(i, i + BATCH_SIZE);
    const batchResult = await extractor(batch, {
      pooling: 'mean',
      normalize: true,
    });

    // Extract embeddings from result
    for (let j = 0; j < batch.length; j++) {
      // @ts-expect-error - tensor indexing
      const embedding = batchResult[j]?.data || batchResult.data;
      if (embedding) {
        allEmbeddings.push(Array.from(embedding as Float32Array));
      }
    }

    const progress = Math.min(100, Math.round(((i + batch.length) / keywords.length) * 100));
    process.stdout.write(`\r   Progress: ${progress}% (${i + batch.length}/${keywords.length})`);
  }

  const embeddingTime = performance.now() - embeddingStart;
  console.log(`\n✅ Embeddings computed in ${(embeddingTime / 1000).toFixed(2)}s\n`);

  // Verify we got the right number
  if (allEmbeddings.length !== emojiData.length) {
    console.error(
      `❌ Embedding count mismatch: got ${allEmbeddings.length}, expected ${emojiData.length}`
    );
    process.exit(1);
  }

  // Verify embedding dimensions
  if (allEmbeddings[0].length !== EMBEDDING_DIM) {
    console.error(
      `❌ Embedding dimension mismatch: got ${allEmbeddings[0].length}, expected ${EMBEDDING_DIM}`
    );
    process.exit(1);
  }

  // Create binary buffer for embeddings
  const totalFloats = allEmbeddings.length * EMBEDDING_DIM;
  const buffer = new Float32Array(totalFloats);

  for (let i = 0; i < allEmbeddings.length; i++) {
    buffer.set(allEmbeddings[i], i * EMBEDDING_DIM);
  }

  // Convert to base64 for JSON storage
  const base64 = Buffer.from(buffer.buffer).toString('base64');

  // Create output object
  const output: EmbeddingsOutput = {
    version: 1,
    modelId: MODEL_ID,
    embeddingDim: EMBEDDING_DIM,
    count: emojis.length,
    emojis,
    embeddingsBase64: base64,
  };

  // Calculate sizes
  const jsonOutput = JSON.stringify(output);
  const jsonSizeKB = (jsonOutput.length / 1024).toFixed(1);
  const binarySizeKB = (buffer.byteLength / 1024).toFixed(1);

  console.log('📦 Output sizes:');
  console.log(`   - Binary embeddings: ${binarySizeKB} KB`);
  console.log(`   - JSON file: ${jsonSizeKB} KB`);

  // Write outputs
  const outputDir = path.join(__dirname, '../src/lib');

  // Write JSON (for easy inspection and TypeScript import)
  const jsonPath = path.join(outputDir, 'emojiEmbeddings.json');
  fs.writeFileSync(jsonPath, jsonOutput);
  console.log(`\n✅ Saved JSON: ${jsonPath}`);

  // Also create a TypeScript module for type-safe imports
  const tsContent = `/**
 * Pre-computed emoji embeddings
 * Generated by: scripts/generateEmojiEmbeddings.ts
 * Model: ${MODEL_ID}
 * Count: ${emojis.length} emojis
 * Generated: ${new Date().toISOString()}
 */

export interface PrecomputedEmbeddings {
  version: number;
  modelId: string;
  embeddingDim: number;
  count: number;
  emojis: string[];
  embeddingsBase64: string;
}

// Import the JSON data
import embeddingsData from './emojiEmbeddings.json';

export const precomputedEmbeddings: PrecomputedEmbeddings = embeddingsData as PrecomputedEmbeddings;

/**
 * Decode the base64 embeddings into a Float32Array
 */
export function decodeEmbeddings(data: PrecomputedEmbeddings): Map<string, number[]> {
  const binary = atob(data.embeddingsBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const floats = new Float32Array(bytes.buffer);

  const embeddings = new Map<string, number[]>();
  for (let i = 0; i < data.count; i++) {
    const start = i * data.embeddingDim;
    const end = start + data.embeddingDim;
    embeddings.set(data.emojis[i], Array.from(floats.slice(start, end)));
  }

  return embeddings;
}
`;

  const tsPath = path.join(outputDir, 'precomputedEmbeddings.ts');
  fs.writeFileSync(tsPath, tsContent);
  console.log(`✅ Saved TypeScript module: ${tsPath}`);

  // Summary
  const totalTime = performance.now() - startTime;
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`   Total emojis: ${emojis.length}`);
  console.log(`   Embedding dimension: ${EMBEDDING_DIM}`);
  console.log(`   Model load time: ${(modelLoadTime / 1000).toFixed(2)}s`);
  console.log(`   Embedding computation: ${(embeddingTime / 1000).toFixed(2)}s`);
  console.log(`   Total time: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`   Output size: ${jsonSizeKB} KB`);
  console.log('='.repeat(50));
  console.log('\n🎉 Done! Embeddings are ready for use.\n');
}

main().catch(console.error);
