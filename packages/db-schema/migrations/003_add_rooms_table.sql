-- Migration: 003_add_rooms_table
-- Description: Add rooms table for reliable active room tracking
-- Applied: Forward-only migration

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY, -- Room code
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  player_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' -- active, abandoned, finished
);

CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_updated ON rooms(updated_at);
