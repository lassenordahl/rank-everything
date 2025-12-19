# Rank Everything CLI Specification

> **Status**: Initial Draft
> **Last Updated**: 2025-12-18
> **Related**: [PROJECT_SPEC.md](./PROJECT_SPEC.md)

---

## 1. Purpose

### 1.1 Why This CLI Exists

This CLI is designed to enable **autonomous, iterative development** by Claude Code. It provides the tooling necessary to:

1. **Verify Implementation Against Spec** - Run tests that validate the API behaves according to PROJECT_SPEC.md
2. **Set Up Test Scenarios** - Create specific game states to test edge cases and user flows
3. **Manage Development Lifecycle** - Reset, seed, migrate, and deploy with single commands
4. **Enable Self-Sufficient Development** - Claude Code can build a feature, test it, fix issues, and iterate without manual intervention

### 1.2 Design Philosophy

- **Spec-Driven Development**: Every CLI command maps back to a requirement in PROJECT_SPEC.md
- **Self-Documenting**: The CLI itself serves as documentation for what the system can do
- **Idempotent Operations**: Commands can be run multiple times safely
- **Progressive Complexity**: Simple commands for common tasks, advanced options for edge cases
- **Autonomous-Friendly**: Commands output structured data (JSON) that Claude Code can parse and act on

### 1.3 Success Criteria

Claude Code should be able to:
- Start from a clean slate and set up the entire development environment
- Build a feature, write tests, run them, and verify they pass
- Simulate a full game session to test the complete flow
- Deploy to production when all tests pass
- Debug issues by inspecting state and logs

---

## 2. CLI Architecture

### 2.1 Technology

```
Location: /apps/cli/
Runtime: Node.js (tsx for TypeScript execution)
Framework: Commander.js or yargs
Output: Structured JSON for programmatic use, pretty output for humans
```

### 2.2 Monorepo Integration

```
/apps/
  /api/          # Cloudflare Workers API
  /web/          # React frontend
  /cli/          # This CLI tool
    /src/
      /commands/
      /lib/
      /utils/
    package.json
    tsconfig.json

/packages/
  /shared-types/ # Shared between all apps
  /db-schema/    # Database schema definitions (D1 + KV)
```

### 2.3 Shared Code

The CLI imports from:
- `@rank-everything/shared-types` - Type definitions
- `@rank-everything/db-schema` - Database schema and migrations
- Direct API client for testing endpoints

---

## 3. Command Reference

### 3.1 Development Environment

#### `rank dev`
Start local development environment (all services).

```bash
rank dev              # Start web + api + wrangler local
rank dev --api-only   # Start only API server
rank dev --web-only   # Start only web frontend
```

#### `rank setup`
Initialize development environment from scratch.

```bash
rank setup            # Install deps, create DBs, run migrations, seed data
rank setup --clean    # Wipe everything first, then setup
```

### 3.2 Database Management

#### `rank db:migrate`
Run database migrations.

```bash
rank db:migrate                    # Run pending migrations
rank db:migrate --status           # Show migration status
rank db:migrate --rollback         # Rollback last migration
rank db:migrate --rollback-all     # Rollback all migrations
```

#### `rank db:reset`
Reset database to clean state.

```bash
rank db:reset                      # Drop all tables, re-run migrations
rank db:reset --seed               # Reset and seed with test data
```

#### `rank db:seed`
Seed database with test data.

```bash
rank db:seed                       # Seed with default test data
rank db:seed --items 1000          # Seed global item pool with N items
rank db:seed --scenario lobby      # Seed specific test scenario
rank db:seed --scenario mid-game
rank db:seed --scenario end-game
```

#### `rank db:inspect`
Inspect current database state.

```bash
rank db:inspect                    # Show summary of all tables
rank db:inspect items              # Show items table
rank db:inspect rooms              # Show active rooms
rank db:inspect --json             # Output as JSON
```

### 3.3 Room Management (Testing)

#### `rank room:create`
Create a test room programmatically.

```bash
rank room:create                           # Create room with defaults
rank room:create --players 4               # Create with N bot players
rank room:create --mode host-only          # Set submission mode
rank room:create --timer 30                # Set timer duration
rank room:create --started                 # Create and start game immediately
```

Output:
```json
{
  "roomCode": "ABCD",
  "hostPlayerId": "xxx",
  "players": [...],
  "wsUrl": "ws://localhost:8787/rooms/ABCD"
}
```

#### `rank room:simulate`
Simulate a full game session.

```bash
rank room:simulate                         # Simulate 4-player game
rank room:simulate --players 6             # Custom player count
rank room:simulate --speed fast            # Run quickly (no delays)
rank room:simulate --speed realtime        # Run with realistic timing
rank room:simulate --output game-log.json  # Save game log
```

#### `rank room:join`
Join a room as a test player (for manual testing).

```bash
rank room:join ABCD --name "TestPlayer"    # Join specific room
rank room:join ABCD --bot                  # Join as bot that auto-ranks
```

#### `rank room:state`
Get current state of a room.

```bash
rank room:state ABCD                       # Get room state
rank room:state ABCD --watch               # Watch for changes
rank room:state ABCD --json                # Output as JSON
```

### 3.4 Testing

#### `rank test`
Run test suites.

```bash
rank test                          # Run all tests
rank test unit                     # Run unit tests only
rank test integration              # Run integration tests
rank test e2e                      # Run end-to-end tests
rank test --watch                  # Watch mode
rank test --coverage               # Generate coverage report
rank test --filter "room"          # Filter tests by name
```

#### `rank test:spec`
Run tests mapped to specific spec requirements.

```bash
rank test:spec                             # Run all spec validation tests
rank test:spec "Feature 1"                 # Test room creation & joining
rank test:spec "Feature 3"                 # Test gameplay loop
rank test:spec "Edge Cases"                # Test edge cases from spec
rank test:spec --report                    # Generate spec compliance report
```

#### `rank test:scenario`
Run specific test scenarios from PROJECT_SPEC.md flows.

```bash
rank test:scenario "Flow A"                # Test custom room flow
rank test:scenario "Flow C"                # Test reconnection flow
rank test:scenario "Journey 1"             # Test in-person friend group journey
```

### 3.5 API Testing

#### `rank api:health`
Check API health.

```bash
rank api:health                    # Check local API
rank api:health --prod             # Check production API
```

#### `rank api:call`
Make API calls for testing.

```bash
rank api:call POST /api/rooms '{"nickname": "Test"}'
rank api:call GET /api/rooms/ABCD
rank api:call GET /api/random-items --query "count=5"
```

### 3.6 Emoji Service

#### `rank emoji:test`
Test emoji assignment service.

```bash
rank emoji:test "orange"                   # Get emoji for single item
rank emoji:test "reading a wikipedia article"
rank emoji:test --batch items.txt          # Test batch from file
rank emoji:test --fallback                 # Test fallback behavior
```

#### `rank emoji:stats`
Show emoji service usage stats.

```bash
rank emoji:stats                           # Show API usage
rank emoji:stats --reset                   # Reset usage counter (dev only)
```

### 3.7 Deployment

#### `rank deploy`
Deploy to Cloudflare.

```bash
rank deploy                        # Deploy all (api + web)
rank deploy api                    # Deploy API only
rank deploy web                    # Deploy web only
rank deploy --preview              # Deploy to preview environment
rank deploy --prod                 # Deploy to production
```

#### `rank deploy:status`
Check deployment status.

```bash
rank deploy:status                 # Show current deployment status
rank deploy:status --logs          # Show recent deployment logs
```

### 3.8 Utilities

#### `rank config`
Manage CLI configuration.

```bash
rank config                        # Show current config
rank config set api.url http://... # Set config value
rank config get api.url            # Get config value
```

#### `rank docs`
Open documentation.

```bash
rank docs                          # Open PROJECT_SPEC.md
rank docs cli                      # Open CLI_SPEC.md
rank docs api                      # Open API docs
```

#### `rank version`
Show version info.

```bash
rank version                       # Show CLI version
rank version --all                 # Show all package versions
```

---

## 4. Test Scenarios

### 4.1 Seeded Scenarios

These scenarios can be created with `rank db:seed --scenario <name>`:

#### `lobby`
Room in lobby state, waiting to start.
- 4 players joined, nicknames set
- Host has configured settings
- Game not started yet

#### `mid-game`
Game in progress, partially completed.
- 4 players
- 5/10 items submitted and ranked
- Currently player 2's turn
- Timer running (30s remaining)

#### `end-game`
Game just completed.
- 4 players
- All 10 items submitted
- All players have ranked everything
- Ready for reveal screen

#### `reconnection`
Room with disconnected player.
- 4 players, 1 disconnected
- Game in progress (3/10 items)
- Disconnected player was mid-turn

#### `timer-expired`
Room with expired timer.
- 4 players
- 7/10 items submitted
- Current turn timer at 0
- Tests auto-skip behavior

### 4.2 Spec Compliance Tests

Tests that map directly to PROJECT_SPEC.md requirements:

```
tests/
  spec/
    feature-1-room-creation.test.ts     # Room codes, nicknames, persistence
    feature-2-room-config.test.ts       # Submission modes, timer settings
    feature-3-gameplay-loop.test.ts     # Turns, submissions, ranking
    feature-4-random-roll.test.ts       # Browse/YOLO modes
    feature-5-emoji-assignment.test.ts  # Haiku API integration
    feature-6-game-end.test.ts          # Reveal, screenshot, carousel
    edge-cases.test.ts                  # Duplicates, disconnects, TTL
    flow-a-custom-room.test.ts          # Full flow test
    flow-c-reconnection.test.ts         # Reconnection flow test
```

---

## 5. Database Schema

### 5.1 D1 Tables (Persistent Storage)

#### `global_items`
Pool of all items ever submitted (for random roll).

```sql
CREATE TABLE global_items (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(text)
);

CREATE INDEX idx_global_items_random ON global_items(id);
```

#### `daily_challenges` (v2)
Pre-generated daily challenges.

```sql
CREATE TABLE daily_challenges (
  date TEXT PRIMARY KEY,  -- YYYY-MM-DD
  items_json TEXT NOT NULL,  -- JSON array of 10 items
  created_at INTEGER NOT NULL
);
```

#### `emoji_usage`
Track emoji API usage for caps.

```sql
CREATE TABLE emoji_usage (
  date TEXT PRIMARY KEY,  -- YYYY-MM-DD
  count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
```

### 5.2 KV Namespace (Room Metadata Cache)

Used for quick room lookups before hitting Durable Objects.

```
Key: room:{code}
Value: {
  "exists": true,
  "status": "lobby" | "in-progress" | "ended",
  "playerCount": 4,
  "createdAt": timestamp,
  "expiresAt": timestamp  // TTL
}
TTL: 10 minutes after last activity
```

### 5.3 Durable Object State (Room State)

Full room state lives in Durable Object memory.

```typescript
interface RoomDurableObjectState {
  room: {
    id: string;
    hostPlayerId: string;
    config: RoomConfig;
    status: 'lobby' | 'in-progress' | 'ended';
    createdAt: number;
    lastActivityAt: number;
  };
  players: Map<string, Player>;
  items: Item[];
  currentTurnIndex: number;
  timerEndAt: number | null;
}
```

---

## 6. Local Development Setup

### 6.1 Prerequisites

```bash
# Required
node >= 18
pnpm >= 8
wrangler >= 3  # Cloudflare CLI

# Optional
just           # Task runner (alternative to npm scripts)
```

### 6.2 First-Time Setup

```bash
# Clone and install
git clone <repo>
cd rank-everything
pnpm install

# Setup CLI globally (optional)
pnpm link --global ./apps/cli

# Initialize local environment
rank setup

# Or manually:
pnpm db:migrate
pnpm db:seed
```

### 6.3 Environment Files

```
/.env.example          # Template
/.env                  # Local overrides (gitignored)

/apps/api/.dev.vars    # Wrangler local secrets
/apps/web/.env.local   # Vite local env
```

Required environment variables:
```bash
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_USAGE_CAP_DAILY=1000
MAX_ITEM_LENGTH=100
ROOM_TTL_MINUTES=10
```

### 6.4 Development Workflow

```bash
# Terminal 1: Start everything
rank dev

# Terminal 2: Run tests as you develop
rank test --watch

# Terminal 3: Simulate games for manual testing
rank room:create --players 4 --started
rank room:state ABCD --watch
```

---

## 7. Deployment Pipeline

### 7.1 Environments

```
preview  - Deployed on every PR
staging  - Deployed on merge to main (optional)
prod     - Manual deployment with approval
```

### 7.2 Deployment Commands

```bash
# Preview deployment (for testing)
rank deploy --preview

# Production deployment
rank test                          # Ensure tests pass
rank deploy --prod                 # Deploy to production

# Rollback if needed
rank deploy:rollback --prod
```

### 7.3 CI/CD Integration

GitHub Actions workflow:
1. On PR: Run tests, deploy to preview
2. On merge to main: Run tests, deploy to staging (if exists)
3. Manual trigger: Deploy to production

---

## 8. Claude Code Integration

### 8.1 How This Helps Claude Code

This CLI enables Claude Code to:

1. **Verify Work Autonomously**
   ```bash
   # After implementing a feature
   rank test --filter "feature-name"
   # Check if tests pass, iterate if not
   ```

2. **Test Edge Cases**
   ```bash
   # Set up specific scenario
   rank db:seed --scenario reconnection
   # Test the scenario
   rank test:scenario "Flow C"
   ```

3. **Debug Issues**
   ```bash
   # Check database state
   rank db:inspect rooms --json
   # Check API health
   rank api:health
   ```

4. **Validate Against Spec**
   ```bash
   # Run all spec compliance tests
   rank test:spec --report
   ```

5. **Deploy with Confidence**
   ```bash
   # Full test suite before deploy
   rank test && rank deploy --prod
   ```

### 8.2 Structured Output

All commands support `--json` flag for programmatic parsing:

```bash
rank room:create --players 4 --json
# Output: {"roomCode": "ABCD", "players": [...], ...}

rank test --json
# Output: {"passed": 42, "failed": 0, "skipped": 2, ...}
```

### 8.3 Error Handling

Commands exit with appropriate codes:
- `0`: Success
- `1`: Failure (tests failed, command error)
- `2`: Configuration error (missing env vars, etc.)

Error output includes actionable information:
```bash
rank deploy --prod
# Error: Tests must pass before production deployment
# Run: rank test
# Then retry: rank deploy --prod
```

---

## 9. Documentation Index

### 9.1 Spec Documents

| Document | Description |
|----------|-------------|
| [PROJECT_SPEC.md](./PROJECT_SPEC.md) | Full product specification |
| [CLI_SPEC.md](./CLI_SPEC.md) | This document |
| [API_SPEC.md](./API_SPEC.md) | API endpoint documentation (to be created) |
| [WEBSOCKET_SPEC.md](./WEBSOCKET_SPEC.md) | WebSocket event documentation (to be created) |

### 9.2 Decision Log

All decisions are tracked in PROJECT_SPEC.md § Decision Log.

### 9.3 Architecture Diagrams

(To be added as implementation progresses)

---

## 10. Implementation Priority

### Phase 1: Foundation
1. ✅ PROJECT_SPEC.md - Complete
2. ✅ CLI_SPEC.md - This document
3. [ ] Monorepo setup (Turborepo, pnpm)
4. [ ] Basic CLI skeleton (Commander.js)
5. [ ] Database schema and migrations
6. [ ] `rank setup` command
7. [ ] `rank dev` command

### Phase 2: Database & Testing
8. [ ] D1 schema implementation
9. [ ] KV namespace setup
10. [ ] `rank db:*` commands
11. [ ] Test infrastructure (Vitest)
12. [ ] `rank test` command
13. [ ] Seed data generators

### Phase 3: API Development
14. [ ] Cloudflare Worker setup
15. [ ] REST endpoints
16. [ ] Durable Objects for rooms
17. [ ] `rank api:*` commands
18. [ ] `rank room:*` commands

### Phase 4: Integration
19. [ ] WebSocket implementation
20. [ ] Emoji service integration
21. [ ] `rank emoji:*` commands
22. [ ] End-to-end tests
23. [ ] `rank test:spec` command

### Phase 5: Deployment
24. [ ] Wrangler configuration
25. [ ] `rank deploy` commands
26. [ ] CI/CD setup
27. [ ] Production deployment

### Phase 6: Frontend
28. [ ] React app setup
29. [ ] Component implementation
30. [ ] Full E2E testing
31. [ ] Production launch
