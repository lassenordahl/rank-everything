/**
 * Simple Emoji Matcher using emojilib
 *
 * A lightweight keyword-based emoji matching system that uses the comprehensive
 * emojilib keyword database. This prevents memory crashes from WebAssembly/ML
 * while providing high-quality emoji matches.
 *
 * Features:
 * - Comprehensive keyword database from emojilib (1800+ emojis)
 * - Plural handling (dog/dogs)
 * - Scoring system (finds best match, not just first match)
 * - Fast Map-based lookup for O(1) access
 */

import emojilib from 'emojilib';

// Fallback emojis for when no keyword matches
const FALLBACK_EMOJIS = [
  '🎲', '🎯', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹',
  '🎸', '🎺', '🎻', '🥁', '🎮', '🎰', '🎳', '✨', '🎇', '🎆',
  '🌟', '💫', '⭐', '🌠', '🔮', '🪄', '🎱', '🧩', '🃏', '🀄',
  '🎴', '🎁', '🎀', '🎊', '🎉', '🎈', '🎏', '🎐',
];

// Build keyword lookup map for O(1) access
// Maps normalized keyword -> array of {emoji, priority} objects
// Priority is based on keyword position (lower = better, 0 = first keyword)
const keywordMap = new Map<string, Array<{ emoji: string; priority: number }>>();

// Process emojilib data to build reverse lookup (keyword -> emoji)
Object.entries(emojilib).forEach(([emoji, keywords]) => {
  keywords.forEach((keyword, index) => {
    // Normalize keyword (lowercase, remove underscores)
    const normalized = keyword.toLowerCase().replace(/_/g, ' ');

    const existing = keywordMap.get(normalized) || [];
    existing.push({ emoji, priority: index });
    keywordMap.set(normalized, existing);
  });
});

// Sort each keyword's emoji list by priority (lower = better)
keywordMap.forEach((emojis, keyword) => {
  emojis.sort((a, b) => a.priority - b.priority);
  keywordMap.set(keyword, emojis);
});

/**
 * Normalize text for matching (lowercase, remove punctuation)
 */
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, '');
}

/**
 * Get singular form of a word (simple heuristic)
 */
function getSingular(word: string): string {
  if (word.endsWith('ies')) {
    return word.slice(0, -3) + 'y'; // babies -> baby
  }
  if (word.endsWith('es')) {
    return word.slice(0, -2); // boxes -> box
  }
  if (word.endsWith('s') && word.length > 3) {
    return word.slice(0, -1); // dogs -> dog
  }
  return word;
}

/**
 * Match text to an emoji based on keywords with scoring
 * @param text - The text to match
 * @returns An emoji that best matches the text, or a random fallback
 */
export function matchEmoji(text: string): string {
  const normalized = normalizeText(text);

  if (!normalized) {
    return getRandomFallbackEmoji();
  }

  let bestMatch: string | null = null;
  let bestScore = 0;
  let bestKeywordLength = 0; // Track keyword length to break ties

  // First, check for multi-word phrase matches (highest priority)
  keywordMap.forEach((emojis, keyword) => {
    if (keyword.includes(' ')) {
      // Multi-word keyword
      if (normalized.includes(keyword)) {
        const score = 110; // Multi-word exact match gets highest score
        if (score > bestScore || (score === bestScore && keyword.length > bestKeywordLength)) {
          if (emojis.length > 0) {
            bestScore = score;
            bestKeywordLength = keyword.length;
            bestMatch = emojis[0]?.emoji ?? null;
          }
        }
      }
    }
  });

  // If we found a multi-word match, return it immediately
  if (bestMatch && bestScore >= 110) {
    return bestMatch;
  }

  // Split into words for single-word matching
  const words = normalized.split(/\s+/);

  // Check each word against all keywords
  for (const word of words) {
    // Try exact match first
    const exactMatches = keywordMap.get(word);
    if (exactMatches && exactMatches.length > 0) {
      const score = 100; // Exact match
      // Prefer higher scores, or longer keywords when scores are equal (e.g., "burger" (6) > "best" (4))
      const shouldUpdate = score > bestScore || (score === bestScore && word.length > bestKeywordLength);
      if (shouldUpdate) {
        bestScore = score;
        bestKeywordLength = word.length;
        bestMatch = exactMatches[0]?.emoji ?? null;
      }
    }

    // Try singular form
    const singular = getSingular(word);
    if (singular !== word) {
      const singularMatches = keywordMap.get(singular);
      if (singularMatches && singularMatches.length > 0) {
        const score = 90; // Singular match
        const shouldUpdate = score > bestScore || (score === bestScore && singular.length > bestKeywordLength);
        if (shouldUpdate) {
          bestScore = score;
          bestKeywordLength = singular.length;
          bestMatch = singularMatches[0]?.emoji ?? null;
        }
      }
    }

    // Try partial matches (word contains keyword or keyword contains word)
    // Only do this for words with length >= 4 to avoid false positives like "in" -> India flag
    if (word.length >= 4) {
      keywordMap.forEach((emojis, keyword) => {
        // Skip multi-word keywords (already handled above)
        if (keyword.includes(' ')) {
          return;
        }

        let score = 0;
        let matchLength = 0;
        // Check if keyword contains word (e.g., "hamburger" contains "burger")
        // Only boost for words that are at least 5 chars to avoid false positives like "i" in "pizza"
        if (keyword.includes(word) && word.length >= 5 && keyword.length > word.length) {
          // Word is substring of keyword - this is a strong match
          score = 105; // Higher than exact match to prefer specific compound words like "burger"→"hamburger"
          matchLength = keyword.length;
        } else if (word.includes(keyword) && keyword.length >= 3) {
          // Word contains keyword - weaker match
          score = 40;
          matchLength = keyword.length;
        }

        if (score > bestScore || (score === bestScore && matchLength > bestKeywordLength)) {
          if (emojis.length > 0) {
            bestScore = score;
            bestKeywordLength = matchLength;
            bestMatch = emojis[0]?.emoji ?? null;
          }
        }
      });
    }
  }

  if (bestMatch && bestScore > 0) {
    return bestMatch;
  }

  // No match found, return random fallback
  return getRandomFallbackEmoji();
}

/**
 * Get a random fallback emoji
 */
function getRandomFallbackEmoji(): string {
  const index = Math.floor(Math.random() * FALLBACK_EMOJIS.length);
  return FALLBACK_EMOJIS[index] ?? '🎲';
}
