-- Migration: 004_add_client_logs
-- Description: Create table for storing client-side logs and errors
-- Applied: Forward-only migration

CREATE TABLE IF NOT EXISTS client_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,          -- Browser session identifier
  timestamp INTEGER NOT NULL,         -- When error occurred
  level TEXT NOT NULL,                -- 'error', 'warn', 'info'
  type TEXT NOT NULL,                 -- 'unhandled_error', 'unhandled_rejection', 'error_boundary', 'websocket', 'webgpu', 'console'
  message TEXT NOT NULL,              -- Error message
  stack TEXT,                         -- Stack trace if available
  component_stack TEXT,               -- React component stack (from ErrorBoundary)
  context TEXT,                       -- JSON blob with additional context
  user_agent TEXT,                    -- Browser user agent
  room_code TEXT,                     -- Room code if in game
  url TEXT,                           -- Current page URL
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_client_logs_timestamp ON client_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_client_logs_session ON client_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_client_logs_type ON client_logs(type);
CREATE INDEX IF NOT EXISTS idx_client_logs_level ON client_logs(level);
