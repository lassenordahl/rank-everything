# Investigation: Global Items Not Saving to D1 Database

**Date**: 2025-12-21
**Status**: RESOLVED ✅
**Issue**: Items submitted in game rooms were not being saved to the `global_items` D1 database table

**Root Cause**: The `WORKER_URL` environment variable had a trailing newline character, causing malformed URLs like `https://...workers.dev\n/api/items`

**Fix**: Added `.trim()` to the `WORKER_URL` when reading it from the environment in `server.ts`

---

## Problem Statement

When users submit items during gameplay, the items appear in the game UI but are NOT persisted to the `global_items` table in the production D1 database. The random roll feature (dice icon) relies on this table, so it only returns seed data.

---

## Architecture Overview

```
┌─────────────────┐     HTTP POST      ┌─────────────────────┐
│   Web Client    │ ───────────────────▶│   PartyKit Server   │
│ (React + Vite)  │     WebSocket       │   (server.ts)       │
└─────────────────┘ ◀──────────────────▶│                     │
                                        │  onMessage()        │
                                        │    └─ handleSubmitItem()
                                        │         └─ saveToGlobalPool()
                                        │              └─ fetch() ────▶ Cloudflare Worker
                                        └─────────────────────┘              (worker.ts)
                                                                                   │
                                                                                   ▼
                                                                         ┌─────────────────┐
                                                                         │   D1 Database   │
                                                                         │ global_items    │
                                                                         └─────────────────┘
```

---

## Findings

### 1. Environment Variable Was Missing (FIXED)

**Initial Issue**: `WORKER_URL` was not set in production PartyKit environment.

**Evidence**:

```
(log) [Server] Constructor. Configured WORKER_URL: undefined
(log) [Server] Defaulting apiUrl to localhost: http://localhost:8787
```

**Fix Applied**: Added `WORKER_URL` via `npx partykit env add WORKER_URL`.

**Result**: Now shows correct URL:

```
(log) [Server] Constructor. Configured WORKER_URL: https://rank-everything-api.lasseanordahl.workers.dev
(log) [Server] Set apiUrl to: https://rank-everything-api.lasseanordahl.workers.dev
```

### 2. Direct Worker Calls Work ✅

Direct HTTP calls to the Worker successfully save items:

```bash
curl -X POST "https://rank-everything-api.lasseanordahl.workers.dev/api/items" \
  -H "Content-Type: application/json" \
  -d '{"text": "Direct Worker Test", "emoji": "🔧"}'
# Returns: {"success":true,"id":"item_1766373981550_5560dc"}
# Item appears in database ✅
```

### 3. PartyKit → Worker Calls Report Success But Don't Save ❌

The verification script shows:

```json
{
  "id": "fb5c78c3-b672-4114-a966-b4f72f3e0c51",
  "text": "Verify-1766374757290",
  "emoji": "✅",
  "_saveResult": "success" // <-- Reports success!
}
```

But the item does NOT appear in the database.

### 4. Worker Logs Not Appearing

When running `wrangler tail` to monitor the Worker, NO logs appear for requests originating from PartyKit, even though direct curl requests show logs. This suggests:

- Either the fetch from PartyKit is not reaching the Worker
- Or the fetch is going somewhere else entirely

### 5. Logs From PartyKit WebSocket Handler Not Appearing

Added logging to `onMessage` in `server.ts`:

```typescript
case 'submit_item':
  console.log('[Server] onMessage: submit_item received, calling handleSubmitItem');
```

This log does NOT appear in `partykit tail`, yet the `item_submitted` event IS broadcast to clients. This is suspicious - either:

- PartyKit tail is filtering/buffering certain logs
- There's something unusual about the execution context

---

## Current Hypotheses

### Hypothesis A: Fetch is Silently Failing

The `fetch()` call in `saveToGlobalPool` might be:

- Timing out silently
- Returning a cached/mocked response
- Being blocked by PartyKit's runtime environment

### Hypothesis B: Different Execution Context

PartyKit Durable Objects run in a specific edge runtime. The `fetch()` might:

- Not have external network access in certain contexts
- Be subject to restrictions not present in direct Worker calls

### Hypothesis C: Response Parsing Issue

The `saveToGlobalPool` function might be:

- Reading a different response than expected
- Not properly awaiting the actual database write

---

## Test Results Summary

| Test Case                        | Result   | Notes                           |
| -------------------------------- | -------- | ------------------------------- |
| CLI `pnpm rank items add`        | ✅ Works | Uses wrangler directly          |
| Direct curl to Worker            | ✅ Works | Items appear in DB              |
| Verification script via PartyKit | ❌ Fails | Reports success but no DB write |
| Real user submission on phone    | ❌ Fails | Items don't appear in DB        |

---

## Files Modified During Investigation

| File                                     | Changes                                                   |
| ---------------------------------------- | --------------------------------------------------------- |
| `apps/api/partykit.json`                 | Added `vars.WORKER_URL` (deprecated, removed)             |
| `apps/api/src/server.ts`                 | Added debug logging to constructor and `saveToGlobalPool` |
| `apps/api/src/handlers/ws/submitItem.ts` | Added debug logging, await `saveToGlobalPool`             |
| `apps/api/src/worker.ts`                 | Added debug logging to `handleAddItem`                    |
| `apps/cli/src/commands/items.ts`         | New CLI command for listing/adding items                  |
| `scripts/verify-submission.ts`           | New E2E verification script                               |

---

## Resolution

### Root Cause Analysis

The issue was a **trailing newline character** in the `WORKER_URL` environment variable.

When the URL was constructed:

```typescript
const url = `${this.apiUrl}/api/items`;
```

The resulting URL was:

```
https://rank-everything-api.lasseanordahl.workers.dev\n/api/items
                                                    ↑ NEWLINE CHARACTER
```

This caused `fetch()` to fail with:

```
TypeError: Fetch API cannot load: https://rank-everything-api.lasseanordahl.workers.dev
/api/items
```

The newline was likely introduced when setting the environment variable via `npx partykit env add WORKER_URL`.

### Key Insight: D1 Not Available in PartyKit Managed Hosting

During investigation, we also discovered that **D1 bindings are not available in PartyKit's managed hosting** (`*.partykit.dev`). The D1 binding (`this.room.env.DB`) is `undefined` in production.

This means:

- `syncRoomToDB()` silently fails in production (but catches the error)
- Direct D1 access is NOT a viable alternative for saving to global_items
- HTTP fetch to the Worker is the correct architecture for PartyKit managed hosting

### The Fix

Added `.trim()` to sanitize the URL when reading from the environment:

```typescript
// BEFORE:
if (envUrl) {
  this.apiUrl = envUrl;
}

// AFTER:
if (envUrl) {
  this.apiUrl = envUrl.trim(); // Handle trailing newlines in env vars
}
```

### Verification

After fix, items are successfully saved to the database:

```
(log) [Server] saveToGlobalPool: Response 200: {"success":true,"id":"item_1766385943865_gv4m2m"}

📋 Global Items (remote)
  ✅  Verify-1766385943732  12/21/2025  ← NEW ITEM SAVED!
```

---

## Related Files

- `apps/api/src/server.ts` - PartyKit server with `saveToGlobalPool`
- `apps/api/src/worker.ts` - Cloudflare Worker with `/api/items` endpoint
- `apps/api/src/handlers/ws/submitItem.ts` - WebSocket handler that calls `saveToGlobalPool`
- `packages/db-schema/migrations/001_initial_schema.sql` - `global_items` table definition
