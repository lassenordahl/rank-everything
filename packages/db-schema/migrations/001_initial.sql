-- Rank Everything Database Schema
-- Initial migration

-- Global items pool (for random roll feature)
CREATE TABLE IF NOT EXISTS global_items (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL UNIQUE,
  emoji TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_global_items_created ON global_items(created_at);

-- Emoji API usage tracking (for daily caps)
CREATE TABLE IF NOT EXISTS emoji_usage (
  date TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

-- Daily challenges (v2 feature, create table now for future)
CREATE TABLE IF NOT EXISTS daily_challenges (
  date TEXT PRIMARY KEY,
  items_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
