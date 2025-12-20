/**
 * Database Schema Package
 *
 * Provides database schema definitions, migration utilities, and seed data
 * for the Rank Everything application.
 *
 * @module @rank-everything/db-schema
 */

// Re-export types
export * from './types.js';

// Re-export migration utilities
export {
  MigrationRunner,
  MIGRATIONS_TABLE_SQL,
  generateChecksum,
  parseMigrationFilename,
  createMigrationFilename,
  createMigrationFile,
} from './migrations.js';

/**
 * Legacy migrations object (kept for backwards compatibility)
 * @deprecated Use SQL migration files in /migrations directory instead
 */
export const migrations = {
  '001_create_global_items': `
    CREATE TABLE IF NOT EXISTS global_items (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL UNIQUE,
      emoji TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_global_items_created
    ON global_items(created_at);
  `,

  '002_create_emoji_usage': `
    CREATE TABLE IF NOT EXISTS emoji_usage (
      date TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
  `,

  '003_create_daily_challenges': `
    CREATE TABLE IF NOT EXISTS daily_challenges (
      date TEXT PRIMARY KEY,
      items_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `,
} as const;

/**
 * Get all legacy migrations in order
 * @deprecated Use loadMigrationsFromDirectory instead
 */
export function getMigrations(): Array<{ name: string; sql: string }> {
  return Object.entries(migrations).map(([name, sql]) => ({ name, sql }));
}

/**
 * Seed data for testing - 30 items for the global item pool
 */
export const seedItems = [
  { text: 'A warm cup of coffee on a rainy day', emoji: '☕' },
  { text: 'Finding money in your old jacket pocket', emoji: '💵' },
  { text: 'The smell of fresh bread', emoji: '🍞' },
  { text: 'Stubbing your toe on furniture', emoji: '🦶' },
  { text: 'Getting a haircut you hate', emoji: '💇' },
  { text: 'A perfectly ripe avocado', emoji: '🥑' },
  { text: 'Stepping in a puddle with socks', emoji: '💦' },
  { text: 'The first bite of pizza', emoji: '🍕' },
  { text: 'Forgetting someones name mid-conversation', emoji: '😰' },
  { text: 'Finding out your favorite show got renewed', emoji: '📺' },
  { text: 'Airport delays', emoji: '✈️' },
  { text: 'A dog that wants to be your friend', emoji: '🐕' },
  { text: 'Waking up thinking its Monday but its Saturday', emoji: '😴' },
  { text: 'Paper cuts', emoji: '📄' },
  { text: 'The perfect parking spot', emoji: '🅿️' },
  { text: 'Running into an ex at the grocery store', emoji: '🛒' },
  { text: 'Clean sheets after a shower', emoji: '🛏️' },
  { text: 'Your phone dying at 1%', emoji: '🔋' },
  { text: 'Free samples at Costco', emoji: '🧀' },
  { text: 'Getting rickrolled', emoji: '🎵' },
  { text: 'A sunset at the beach', emoji: '🌅' },
  { text: 'Realizing you sent a text to the wrong person', emoji: '📱' },
  { text: 'Fresh socks', emoji: '🧦' },
  { text: 'Mosquito bites', emoji: '🦟' },
  { text: 'The last slice of cake', emoji: '🍰' },
  { text: 'Slow WiFi', emoji: '📶' },
  { text: 'A hug from someone you love', emoji: '🤗' },
  { text: 'Sitting on a warm toilet seat in public', emoji: '🚽' },
  { text: 'Finally understanding a math problem', emoji: '🧮' },
  { text: 'When your food arrives at a restaurant', emoji: '🍽️' },
];

/**
 * Generate seed SQL for global items
 */
export function generateSeedSQL(items: typeof seedItems): string {
  const values = items
    .map(
      (item, i) =>
        `('seed_${String(i).padStart(3, '0')}', '${item.text.replace(/'/g, "''")}', '${item.emoji}', ${Date.now()})`
    )
    .join(',\n  ');

  return `
    INSERT OR IGNORE INTO global_items (id, text, emoji, created_at)
    VALUES
      ${values};
  `;
}

/**
 * Get the relative path to the migrations directory from package root
 * The CLI should resolve this relative to the db-schema package location
 */
export const MIGRATIONS_DIR_NAME = 'migrations';
