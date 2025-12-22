/**
 * Performance Tests for EmojiLLM Service
 *
 * These tests measure the actual performance of emoji model initialization
 * and classification. They require a real browser environment.
 *
 * Run with: npx vitest run src/lib/emojiLLM.perf.test.ts --browser
 * Or: npm run test:perf
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
  // Target: <3s for embedding load (was ~3-5s with runtime computation)
  // With pre-computed embeddings, should be <500ms
  embeddingsLoad: 1000,

  // First classification includes model load, so higher threshold
  firstClassification: 15000,

  // Subsequent classifications should be fast
  subsequentClassification: 500,

  // Total initialization to ready state
  initialization: 1000,
};

describe('EmojiLLM Performance', () => {
  // Skip in CI or test environments without worker support
  const shouldRun = typeof Worker !== 'undefined';

  describe.skipIf(!shouldRun)('Real Performance Tests', () => {
    let emojiLLM: typeof import('./emojiLLM').emojiLLM;

    beforeAll(async () => {
      // Fresh import for performance testing
      const module = await import('./emojiLLM');
      emojiLLM = module.emojiLLM;
    });

    it('should initialize with pre-computed embeddings under threshold', async () => {
      const startTime = performance.now();

      await emojiLLM.initialize();

      const initTime = performance.now() - startTime;
      const threshold = THRESHOLDS.initialization;

      console.log(
        `[Perf] Initialization time: ${initTime.toFixed(0)}ms (threshold: ${threshold}ms)`
      );

      expect(emojiLLM.ready).toBe(true);
      expect(initTime).toBeLessThan(threshold);
    });

    it('should report initialization time via API', async () => {
      if (!emojiLLM.ready) {
        await emojiLLM.initialize();
      }

      const initTime = emojiLLM.initTime;
      console.log(`[Perf] Reported init time: ${initTime?.toFixed(0)}ms`);

      expect(initTime).not.toBeNull();
      expect(initTime).toBeLessThan(THRESHOLDS.initialization);
    });

    it('should classify emoji within threshold (first call may load model)', async () => {
      if (!emojiLLM.ready) {
        await emojiLLM.initialize();
      }

      const startTime = performance.now();
      const result = await emojiLLM.classifyEmoji('pizza');
      const classifyTime = performance.now() - startTime;

      console.log(`[Perf] First classification: ${classifyTime.toFixed(0)}ms → ${result}`);

      expect(result).toBeTruthy();
      expect(classifyTime).toBeLessThan(THRESHOLDS.firstClassification);
    });

    it('should classify subsequent emojis quickly', async () => {
      if (!emojiLLM.ready) {
        await emojiLLM.initialize();
      }

      // Warm up (first classification may have loaded model)
      await emojiLLM.classifyEmoji('warmup');

      // Now test subsequent classifications
      const testCases = ['happy', 'sad', 'fire', 'water', 'sun'];
      const times: number[] = [];

      for (const text of testCases) {
        const startTime = performance.now();
        const result = await emojiLLM.classifyEmoji(text);
        const time = performance.now() - startTime;
        times.push(time);
        console.log(`[Perf] "${text}" → ${result} (${time.toFixed(0)}ms)`);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`[Perf] Average subsequent classification: ${avgTime.toFixed(0)}ms`);

      expect(avgTime).toBeLessThan(THRESHOLDS.subsequentClassification);
    });

    it('should report worker metrics', async () => {
      if (!emojiLLM.ready) {
        await emojiLLM.initialize();
        // Trigger a classification to ensure model is loaded
        await emojiLLM.classifyEmoji('test');
      }

      const metrics = await emojiLLM.getMetrics();

      if (metrics) {
        console.log('[Perf] Worker metrics:', {
          embeddingsLoadTime: `${metrics.embeddingsLoadTime.toFixed(0)}ms`,
          modelLoadTime: metrics.modelLoadTime
            ? `${metrics.modelLoadTime.toFixed(0)}ms`
            : 'not loaded',
          totalInitTime: `${metrics.totalInitTime.toFixed(0)}ms`,
          embeddingCount: metrics.embeddingCount,
          classificationCount: metrics.classificationCount,
          avgClassificationTime: `${metrics.avgClassificationTime.toFixed(0)}ms`,
        });

        expect(metrics.embeddingsLoadTime).toBeLessThan(THRESHOLDS.embeddingsLoad);
        expect(metrics.embeddingCount).toBeGreaterThan(1000);
      }
    });
  });

  // Unit test version that works in all environments
  describe('Performance Thresholds', () => {
    it('should have reasonable threshold values', () => {
      expect(THRESHOLDS.embeddingsLoad).toBeLessThanOrEqual(1000);
      expect(THRESHOLDS.initialization).toBeLessThanOrEqual(1000);
      expect(THRESHOLDS.subsequentClassification).toBeLessThanOrEqual(500);
    });
  });
});

/**
 * Benchmark utility for detailed performance analysis
 */
export async function runPerformanceBenchmark(): Promise<{
  initTime: number;
  embeddingsLoadTime: number;
  modelLoadTime: number | null;
  classificationTimes: number[];
  avgClassificationTime: number;
}> {
  const { emojiLLM } = await import('./emojiLLM');

  // Measure initialization
  const initStart = performance.now();
  await emojiLLM.initialize();
  const initTime = performance.now() - initStart;

  // Measure classifications
  const testInputs = [
    'pizza',
    'happy face',
    'fire',
    'water',
    'sun',
    'moon',
    'heart',
    'star',
    'cat',
    'dog',
  ];

  const classificationTimes: number[] = [];

  for (const input of testInputs) {
    const start = performance.now();
    await emojiLLM.classifyEmoji(input);
    classificationTimes.push(performance.now() - start);
  }

  const avgClassificationTime =
    classificationTimes.reduce((a, b) => a + b, 0) / classificationTimes.length;

  // Get worker metrics
  const metrics = await emojiLLM.getMetrics();

  return {
    initTime,
    embeddingsLoadTime: metrics?.embeddingsLoadTime ?? 0,
    modelLoadTime: metrics?.modelLoadTime ?? null,
    classificationTimes,
    avgClassificationTime,
  };
}
