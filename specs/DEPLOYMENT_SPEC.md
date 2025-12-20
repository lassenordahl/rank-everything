# Deployment Management Specification

This document describes the deployment and database management process for Rank Everything. It is designed to be operated by both humans and AI agents.

## Overview

Rank Everything uses:
- **Cloudflare Pages** for the web frontend
- **Cloudflare PartyKit** for real-time WebSocket server (Durable Objects)
- **Cloudflare D1** for persistent data storage (SQLite)
- **Cloudflare KV** for caching

## Database Architecture

### Storage Layers

| Layer | Technology | Purpose | Data |
|-------|------------|---------|------|
| Durable Objects | PartyKit | Real-time game state | Room state, players, rankings (ephemeral) |
| D1 Database | Cloudflare SQLite | Persistent storage | Global items, emoji usage, daily challenges |
| KV Cache | Cloudflare KV | Fast lookups | Room metadata cache |

### D1 Database Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `_migrations` | Migration tracking | version, name, checksum, applied_at |
| `global_items` | Random roll item pool | id, text, emoji, created_at |
| `emoji_usage` | API rate limiting | date, count, updated_at |
| `daily_challenges` | Daily challenge mode (v2) | date, items_json, created_at |

## Migration System

### Principles

1. **Forward-only** - Migrations can only be applied forward, never rolled back
2. **Versioned** - Each migration has a unique version number
3. **Tracked** - Applied migrations are recorded in `_migrations` table
4. **Checksummed** - File modifications are detected via checksum comparison
5. **Idempotent** - Migrations use `IF NOT EXISTS` and `INSERT OR IGNORE`

### Migration File Format

Migration files are stored in `packages/db-schema/migrations/` with the format:

```
NNN_description.sql
```

Where:
- `NNN` is a zero-padded version number (001, 002, etc.)
- `description` is a snake_case description

Example: `001_initial_schema.sql`

### Migration File Template

```sql
-- Migration: NNN_description
-- Description: Human-readable description
-- Applied: Forward-only migration

-- Add your SQL statements here
CREATE TABLE IF NOT EXISTS my_table (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

### CLI Commands

```bash
# Run pending migrations (local by default)
pnpm rank db migrate

# Run migrations on production
pnpm rank db migrate --remote

# Check migration status
pnpm rank db migrate --status
pnpm rank db migrate --status --remote

# Create a new migration file
pnpm rank db migrate:create "add feature flags table"

# Seed the database with test data
pnpm rank db seed
pnpm rank db seed --remote

# Reset database (drops all tables, re-runs migrations)
pnpm rank db reset
pnpm rank db reset --seed  # Also seed after reset
pnpm rank db reset --remote --force  # Production reset (requires --force)

# Inspect database
pnpm rank db inspect                    # Show schema
pnpm rank db inspect global_items       # Show table contents
pnpm rank db inspect --json             # JSON output
```

## Deployment Process

### Standard Deployment

For a routine deployment with no database changes:

```bash
# 1. Run tests
pnpm test

# 2. Deploy all services
npm run deploy

# Or deploy individually:
npm run deploy:api   # PartyKit server
npm run deploy:web   # Cloudflare Pages
```

### Deployment with Database Migrations

When deploying with database schema changes:

```bash
# 1. Create the migration file
pnpm rank db migrate:create "add new table"

# 2. Edit the migration file in packages/db-schema/migrations/

# 3. Test locally
pnpm rank db reset --seed
pnpm dev
# ... verify the changes work ...

# 4. Run all tests
pnpm test

# 5. Deploy the API first (in case migration references new code)
npm run deploy:api

# 6. Run migrations on production
pnpm rank db migrate --remote

# 7. Verify migration status
pnpm rank db migrate --status --remote

# 8. Deploy the web frontend
npm run deploy:web

# 9. Run production smoke tests
npm run e2e:prod
```

### First-Time Setup

For a new environment:

```bash
# 1. Login to Cloudflare
npx wrangler login

# 2. Create the D1 database
pnpm rank db create

# 3. Copy the database_id to apps/api/wrangler.toml

# 4. Run migrations
pnpm rank db migrate --remote

# 5. Seed with initial data
pnpm rank db seed --remote

# 6. Deploy
npm run deploy
```

## Agent Operations

### Creating a New Table

When asked to add a new database table:

```bash
# 1. Create migration
pnpm rank db migrate:create "add table_name table"

# 2. Edit the generated file at packages/db-schema/migrations/NNN_add_table_name_table.sql

# 3. Test locally
pnpm rank db migrate
pnpm rank db inspect table_name

# 4. Run tests
pnpm --filter "@rank-everything/db-schema" test
pnpm test

# 5. If deploying, follow the deployment with migrations process
```

### Modifying an Existing Table

For schema modifications (adding columns, indexes, etc.):

```bash
# 1. Create a new migration (NEVER modify existing migrations)
pnpm rank db migrate:create "add column to table_name"

# 2. Use ALTER TABLE in the migration
# Example:
# ALTER TABLE table_name ADD COLUMN new_column TEXT DEFAULT '';

# 3. Test and deploy as above
```

### Checking Database State

```bash
# View all tables and indexes
pnpm rank db inspect

# View specific table data
pnpm rank db inspect global_items

# Check migration status
pnpm rank db migrate --status

# Get JSON output for programmatic use
pnpm rank db inspect --json
pnpm rank db inspect global_items --json
```

### Recovering from Issues

If migrations fail on production:

```bash
# 1. Check status to see which migrations failed
pnpm rank db migrate --status --remote

# 2. Check error logs in Cloudflare dashboard

# 3. If needed, manually fix via wrangler
cd apps/api
npx wrangler d1 execute rank-everything-db --remote --command "YOUR SQL HERE"

# 4. If the _migrations table is corrupted, you may need to manually
#    insert the migration record:
npx wrangler d1 execute rank-everything-db --remote --command \
  "INSERT INTO _migrations (version, name, applied_at, checksum) VALUES (N, 'name', $(date +%s)000, 'checksum')"
```

## Environment Variables

### Required for Deployment

| Variable | Where | Purpose |
|----------|-------|---------|
| `CLOUDFLARE_ACCOUNT_ID` | GitHub Secrets | Cloudflare account |
| `CLOUDFLARE_API_TOKEN` | GitHub Secrets | Deployment auth |
| `ANTHROPIC_API_KEY` | wrangler.toml secrets | Emoji generation |

### D1 Database Configuration

In `apps/api/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "rank-everything-db"
database_id = "YOUR_DATABASE_ID"  # From `pnpm rank db create`
```

## Monitoring

### Database Health

```bash
# Check table row counts
pnpm rank db inspect global_items --json | jq 'length'
pnpm rank db inspect emoji_usage --json

# Check recent items
pnpm rank db inspect global_items
```

### Deployment Status

```bash
# Check deployment logs
pnpm rank deploy:status --logs

# Production smoke tests
npm run e2e:prod
```

## Rollback Strategy

Since migrations are forward-only:

1. **Data-only changes** - Create a new migration to reverse the data change
2. **Schema changes** - Create a new migration to alter/drop as needed
3. **Code changes** - Redeploy previous code version via git

Example rollback migration:

```sql
-- Migration: 005_revert_feature_flags
-- Description: Remove feature_flags table added in 004
-- Applied: Forward-only migration

DROP TABLE IF EXISTS feature_flags;
```

## Troubleshooting

### "Database not found"

```bash
# Check if database exists
npx wrangler d1 list

# If not, create it
pnpm rank db create
```

### "Migration validation failed"

```bash
# Check which migration was modified
pnpm rank db migrate --status

# If intentional, you need to reset the database
# WARNING: This loses all data!
pnpm rank db reset --remote --force
```

### "Cannot connect to database"

```bash
# Check wrangler login
npx wrangler whoami

# Re-login if needed
npx wrangler login
```

## Best Practices

1. **Always test locally first** - Run migrations on local database before production
2. **Create small, focused migrations** - One logical change per migration
3. **Use IF NOT EXISTS / IF EXISTS** - Make migrations idempotent
4. **Never modify applied migrations** - Always create new migrations
5. **Keep migration files in version control** - They are the source of truth
6. **Run tests after migrations** - Ensure app code is compatible
7. **Monitor after deployment** - Check error rates and functionality
