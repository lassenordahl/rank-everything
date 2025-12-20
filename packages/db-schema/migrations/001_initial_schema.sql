-- Migration: 001_initial_schema
-- Description: Create initial database tables for Rank Everything
-- Applied: Forward-only migration

-- Global items table for random roll feature
CREATE TABLE IF NOT EXISTS global_items (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL UNIQUE,
  emoji TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_global_items_created
ON global_items(created_at);

-- Emoji API usage tracking for rate limiting
CREATE TABLE IF NOT EXISTS emoji_usage (
  date TEXT PRIMARY KEY,  -- YYYY-MM-DD format
  count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

-- Daily challenges table (v2 feature, schema reserved)
CREATE TABLE IF NOT EXISTS daily_challenges (
  date TEXT PRIMARY KEY,  -- YYYY-MM-DD format
  items_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
