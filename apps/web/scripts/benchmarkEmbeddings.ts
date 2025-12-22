/**
 * Benchmark Script: Compare old vs new embedding loading performance
 *
 * This script measures:
 * 1. Time to load pre-computed embeddings (NEW approach)
 * 2. Time to compute embeddings at runtime (OLD approach)
 *
 * Run with: npx tsx scripts/benchmarkEmbeddings.ts
 */

import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface BenchmarkResult {
  name: string;
  time: number;
  details?: Record<string, number | string>;
}

const results: BenchmarkResult[] = [];

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

async function benchmarkPrecomputedEmbeddings(): Promise<BenchmarkResult> {
  console.log('\n📊 Benchmarking PRE-COMPUTED embeddings loading...\n');

  const startTime = performance.now();

  // Load the JSON file
  const jsonPath = path.join(__dirname, '../src/lib/emojiEmbeddings.json');
  const loadStart = performance.now();
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const loadTime = performance.now() - loadStart;

  // Decode base64 embeddings
  const decodeStart = performance.now();
  const binary = Buffer.from(jsonData.embeddingsBase64, 'base64');
  const floats = new Float32Array(
    binary.buffer,
    binary.byteOffset,
    binary.byteLength / Float32Array.BYTES_PER_ELEMENT
  );

  // Build the embeddings map
  const embeddings = new Map<string, number[]>();
  const embeddingDim = jsonData.embeddingDim;
  for (let i = 0; i < jsonData.count; i++) {
    const start = i * embeddingDim;
    const end = start + embeddingDim;
    embeddings.set(jsonData.emojis[i], Array.from(floats.slice(start, end)));
  }
  const decodeTime = performance.now() - decodeStart;

  const totalTime = performance.now() - startTime;

  console.log(`   JSON file load: ${formatMs(loadTime)}`);
  console.log(`   Base64 decode + map build: ${formatMs(decodeTime)}`);
  console.log(`   Total embeddings loaded: ${embeddings.size}`);
  console.log(`   ✅ Total time: ${formatMs(totalTime)}`);

  return {
    name: 'Pre-computed Embeddings',
    time: totalTime,
    details: {
      jsonLoadTime: loadTime,
      decodeTime: decodeTime,
      embeddingCount: embeddings.size,
    },
  };
}

async function benchmarkRuntimeComputation(): Promise<BenchmarkResult> {
  console.log('\n📊 Benchmarking RUNTIME embedding computation (OLD method)...\n');

  const startTime = performance.now();

  // Load emoji data
  const emojiDataPath = path.join(__dirname, '../src/lib/emojiData.json');
  const emojiData = JSON.parse(fs.readFileSync(emojiDataPath, 'utf-8'));
  console.log(`   Loaded ${emojiData.length} emoji entries`);

  // Load model
  const modelLoadStart = performance.now();
  console.log('   Loading model...');
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  const modelLoadTime = performance.now() - modelLoadStart;
  console.log(`   Model loaded in ${formatMs(modelLoadTime)}`);

  // Compute embeddings
  const embedStart = performance.now();
  const keywords = emojiData.map((e: { keywords: string }) => e.keywords);
  const batchSize = 32;
  let processed = 0;

  for (let i = 0; i < keywords.length; i += batchSize) {
    const batch = keywords.slice(i, i + batchSize);
    await (extractor as FeatureExtractionPipeline)(batch, {
      pooling: 'mean',
      normalize: true,
    });
    processed += batch.length;
    process.stdout.write(`\r   Computing embeddings: ${processed}/${keywords.length}`);
  }
  const embedTime = performance.now() - embedStart;
  console.log(`\n   Embeddings computed in ${formatMs(embedTime)}`);

  const totalTime = performance.now() - startTime;
  console.log(`   ✅ Total time: ${formatMs(totalTime)}`);

  return {
    name: 'Runtime Computation',
    time: totalTime,
    details: {
      modelLoadTime: modelLoadTime,
      embeddingComputeTime: embedTime,
      embeddingCount: emojiData.length,
    },
  };
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 EMOJI EMBEDDING LOADING BENCHMARK');
  console.log('='.repeat(60));

  // Benchmark pre-computed (NEW)
  const precomputedResult = await benchmarkPrecomputedEmbeddings();
  results.push(precomputedResult);

  // Benchmark runtime computation (OLD)
  const runtimeResult = await benchmarkRuntimeComputation();
  results.push(runtimeResult);

  // Print comparison
  console.log('\n' + '='.repeat(60));
  console.log('📈 RESULTS COMPARISON');
  console.log('='.repeat(60));

  const improvement = runtimeResult.time / precomputedResult.time;
  const timeSaved = runtimeResult.time - precomputedResult.time;

  console.log(`
┌────────────────────────────────────────────────────────┐
│ Method                        │ Time                   │
├───────────────────────────────┼────────────────────────┤
│ Pre-computed Embeddings (NEW) │ ${formatMs(precomputedResult.time).padEnd(22)}│
│ Runtime Computation (OLD)     │ ${formatMs(runtimeResult.time).padEnd(22)}│
├───────────────────────────────┼────────────────────────┤
│ Speedup                       │ ${improvement.toFixed(1)}x faster${' '.repeat(14)}│
│ Time Saved                    │ ${formatMs(timeSaved).padEnd(22)}│
└────────────────────────────────────────────────────────┘
`);

  // Target check
  const targetMs = 3000;
  const meetsTarget = precomputedResult.time < targetMs;
  console.log(`\n🎯 Target: < ${formatMs(targetMs)} initialization`);
  console.log(
    `${meetsTarget ? '✅' : '❌'} Pre-computed approach: ${formatMs(precomputedResult.time)} ${
      meetsTarget ? '(MEETS TARGET)' : '(EXCEEDS TARGET)'
    }`
  );

  console.log('\n' + '='.repeat(60));
  console.log('📋 DETAILED BREAKDOWN');
  console.log('='.repeat(60));

  for (const result of results) {
    console.log(`\n${result.name}:`);
    if (result.details) {
      for (const [key, value] of Object.entries(result.details)) {
        const formattedValue =
          typeof value === 'number' && key.includes('Time') ? formatMs(value) : value;
        console.log(`   ${key}: ${formattedValue}`);
      }
    }
  }

  console.log('\n🎉 Benchmark complete!\n');
}

main().catch(console.error);
