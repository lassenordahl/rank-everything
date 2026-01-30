/**
 * Quantize Emoji Embeddings from Float32 to Int8
 *
 * This script takes the existing Float32 embeddings and quantizes them to Int8,
 * reducing file size by ~75% (4 bytes → 1 byte per value) with minimal accuracy loss.
 *
 * Float32: 3.8MB → Int8: ~1MB
 *
 * Run with: npx tsx scripts/quantizeEmbeddings.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface EmbeddingsInput {
  version: number;
  modelId: string;
  embeddingDim: number;
  count: number;
  emojis: string[];
  embeddingsBase64: string;
}

interface QuantizedEmbeddingsOutput {
  version: number;
  modelId: string;
  embeddingDim: number;
  count: number;
  emojis: string[];
  quantized: true;
  // Embeddings stored as base64-encoded Int8Array
  embeddingsBase64: string;
}

async function main() {
  console.log('🔢 Starting embedding quantization...\n');
  const startTime = performance.now();

  // Load existing Float32 embeddings
  const inputPath = path.join(__dirname, '../src/lib/emojiEmbeddings.json');
  console.log(`📥 Loading embeddings from: ${inputPath}`);

  const inputData: EmbeddingsInput = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

  console.log(`   - Emojis: ${inputData.count}`);
  console.log(`   - Dimensions: ${inputData.embeddingDim}`);
  console.log(`   - Model: ${inputData.modelId}\n`);

  // Decode Float32 embeddings
  console.log('🔓 Decoding Float32 embeddings...');
  const binary = Buffer.from(inputData.embeddingsBase64, 'base64');
  const floats = new Float32Array(binary.buffer, binary.byteOffset, binary.byteLength / 4);

  const originalSizeKB = (binary.byteLength / 1024).toFixed(1);
  console.log(`   Original size: ${originalSizeKB} KB\n`);

  // Quantize to Int8 (range: -127 to 127)
  console.log('⚙️  Quantizing Float32 → Int8...');
  const quantized = new Int8Array(floats.length);

  for (let i = 0; i < floats.length; i++) {
    // Embeddings are normalized to roughly [-1, 1]
    // Scale to [-127, 127] and round
    quantized[i] = Math.round(Math.max(-127, Math.min(127, floats[i] * 127)));
  }

  const quantizedSizeKB = (quantized.byteLength / 1024).toFixed(1);
  console.log(`   Quantized size: ${quantizedSizeKB} KB`);
  console.log(`   Reduction: ${((1 - quantized.byteLength / binary.byteLength) * 100).toFixed(1)}%\n`);

  // Convert to base64
  console.log('📦 Encoding to base64...');
  const quantizedBase64 = Buffer.from(quantized.buffer).toString('base64');

  // Create output object
  const output: QuantizedEmbeddingsOutput = {
    version: inputData.version,
    modelId: inputData.modelId,
    embeddingDim: inputData.embeddingDim,
    count: inputData.count,
    emojis: inputData.emojis,
    quantized: true,
    embeddingsBase64: quantizedBase64,
  };

  // Write quantized embeddings
  const outputPath = path.join(__dirname, '../src/lib/emojiEmbeddingsQuantized.json');
  const jsonOutput = JSON.stringify(output);
  fs.writeFileSync(outputPath, jsonOutput);

  const finalSizeKB = (jsonOutput.length / 1024).toFixed(1);
  console.log(`\n✅ Saved quantized embeddings: ${outputPath}`);
  console.log(`   Final JSON size: ${finalSizeKB} KB\n`);

  // Quality check: measure quantization error
  console.log('🔍 Quality check...');
  let totalError = 0;
  let maxError = 0;

  for (let i = 0; i < Math.min(1000, floats.length); i++) {
    const original = floats[i];
    const dequantized = quantized[i] / 127.0;
    const error = Math.abs(original - dequantized);
    totalError += error;
    maxError = Math.max(maxError, error);
  }

  const avgError = totalError / Math.min(1000, floats.length);
  console.log(`   Average error: ${(avgError * 100).toFixed(4)}%`);
  console.log(`   Max error: ${(maxError * 100).toFixed(4)}%`);

  // Summary
  const totalTime = performance.now() - startTime;
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`   Original size: ${originalSizeKB} KB`);
  console.log(`   Quantized size: ${quantizedSizeKB} KB`);
  console.log(`   Final JSON size: ${finalSizeKB} KB`);
  console.log(`   Size reduction: ${((1 - parseInt(finalSizeKB) / parseInt((fs.statSync(inputPath).size / 1024).toFixed(0))) * 100).toFixed(1)}%`);
  console.log(`   Time: ${(totalTime / 1000).toFixed(2)}s`);
  console.log('='.repeat(50));
  console.log('\n🎉 Quantization complete!\n');
}

main().catch(console.error);
