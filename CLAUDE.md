# Claude Context

## Project: Rank Everything

A real-time multiplayer party game where players rank items 1-10. Simple concept, clean execution.

## Project Approach

This repository follows a **specification-first development approach** with **CLI-driven autonomous development**. The goal is:
1. Create detailed specs before implementation
2. Build tooling that enables Claude Code to develop, test, and iterate autonomously
3. Achieve high-quality, one-shot builds with minimal manual intervention

## Documentation Index

| Document | Purpose |
|----------|---------|
| [specs/PROJECT_SPEC.md](specs/PROJECT_SPEC.md) | Full product specification - features, flows, data models, API |
| [specs/CLI_SPEC.md](specs/CLI_SPEC.md) | CLI tool for autonomous development, testing, deployment |

## Tech Stack

- **Frontend**: React + Vite + shadcn/ui on Cloudflare Pages
- **Backend**: Node.js on Cloudflare Workers
- **Real-time**: Cloudflare Durable Objects (WebSockets)
- **Database**: Cloudflare D1 (SQLite) + KV
- **Monorepo**: Turborepo + pnpm
- **Deployment**: Cloudflare free tier

## Monorepo Structure

```
/apps/web/       # React frontend (Cloudflare Pages)
/apps/api/       # Cloudflare Workers + Durable Objects
/apps/cli/       # Development CLI tool
/packages/shared-types/  # Shared TypeScript types
/packages/db-schema/     # Database schemas
/specs/          # All specification documents
```

## Development Philosophy

1. **Spec First** - Every feature is fully specified before implementation
2. **CLI-Driven Development** - Use `rank` CLI to test, seed, and validate
3. **Autonomous Iteration** - Claude Code can build, test, fix, and deploy
4. **Spec Compliance** - Tests map directly to spec requirements
5. **Keep It Simple** - Minimal, focused implementation

## CLI Commands (Development Tooling)

Run via `pnpm rank <command>` from anywhere in the monorepo:

```bash
pnpm rank setup           # Initialize dev environment
pnpm rank dev             # Start local development
pnpm rank db migrate      # Run database migrations
pnpm rank db seed         # Seed test data
pnpm rank db reset        # Reset database
pnpm rank test            # Run tests
pnpm rank test:spec       # Run spec compliance tests
pnpm rank room create     # Create test room (--json for structured output)
pnpm rank room simulate   # Simulate full game
pnpm rank deploy          # Deploy to Cloudflare
```

See [CLI_SPEC.md](specs/CLI_SPEC.md) for full command reference.

## Working with This Project

### For Claude Code:
1. **Before implementing**: Read the relevant section of PROJECT_SPEC.md
2. **After implementing**: Run `rank test` to verify
3. **Test edge cases**: Use `rank db:seed --scenario <name>`
4. **Validate spec compliance**: Run `rank test:spec`
5. **Debug**: Use `rank db:inspect` and `rank room:state`

### Key Principles:
- PROJECT_SPEC.md is the source of truth
- Run tests before considering a feature complete
- Use structured output (`--json`) for programmatic checks
- Keep specs updated as implementation decisions are made

## Current State

**Phase**: Core Implementation Complete, Ready for Testing

**Completed:**
- [x] Product specification (PROJECT_SPEC.md)
- [x] CLI specification (CLI_SPEC.md)
- [x] Monorepo structure (Turborepo + pnpm)
- [x] Shared types package (@rank-everything/shared-types)
- [x] Database schema package (@rank-everything/db-schema)
- [x] CLI with all commands (@rank-everything/cli)
- [x] PartyKit server with WebSocket handlers
- [x] Cloudflare Worker for REST API (emoji, items, random roll)
- [x] Emoji assignment service with Haiku API
- [x] React frontend with all views (HomePage, RoomLobby, GameView, RevealScreen)
- [x] Random roll modal with Browse/YOLO modes
- [x] Screenshot functionality (html2canvas)

**Next Steps:**
1. Create D1 database with wrangler (`wrangler d1 create rank-everything-db`)
2. Run migrations (`wrangler d1 execute`)
3. Test locally: `pnpm rank dev`
4. Deploy: `pnpm rank deploy --prod`
5. End-to-end testing with real multiplayer

## Quick Reference

**V1 Features:**
- Custom rooms with 4-letter codes
- Round-robin or host-only submission modes
- 60s configurable timer
- 10 items per game
- Private rankings until reveal
- Random roll from global item pool
- Emoji assignment via Haiku API
- Screenshot sharing at reveal

**Not in V1:**
- Daily challenge mode
- Animations
- User accounts
- Sound effects

## Agent Guidelines for Development

### CRITICAL: Build & Test Verification

**Before completing ANY task that modifies code:**

1. **Run TypeScript Check**:
   ```bash
   pnpm tsc --noEmit -p apps/web
   ```

2. **Run Tests**:
   ```bash
   pnpm test --prefix apps/web
   ```

3. **Check for Runtime Errors**:
   - If dev servers are running, check browser console for errors
   - Look for `ReferenceError`, `TypeError`, or unhandled exceptions

### Development Workflow

1. **Before making changes**: Understand the current state of the component/file
2. **After making changes**: Always verify:
   - No TypeScript errors (`pnpm tsc --noEmit`)
   - Tests pass (`pnpm test`)
   - No runtime errors in browser console

### Common Mistakes to Avoid

1. **Missing imports**: Always add imports when using new components/hooks
2. **Missing state declarations**: When using `setX()`, ensure `const [x, setX] = useState()` exists
3. **Breaking changes to shared types**: Check all consumers when modifying types
4. **Environment variables**: Ensure `.env` files are properly configured

### Testing Requirements

- **Unit tests**: All API client methods must have tests
- **Component tests**: Critical user flows must have tests
- **Test location**: Place tests next to source files (`*.test.ts` or `*.test.tsx`)
- **Run before PR**: `pnpm test` must pass before considering work complete

### Error Recovery

If you introduce a bug:
1. Immediately check the error message and stack trace
2. View the relevant file at the line number mentioned
3. Fix the issue before proceeding with other work
4. Run tests again to verify the fix

### Monorepo Commands Reference

```bash
# From root directory
pnpm dev                    # Start all dev servers
pnpm build                  # Build all packages
pnpm test                   # Run all tests
pnpm test --prefix apps/web # Run web tests only
pnpm tsc --noEmit -p apps/web  # TypeScript check
```

