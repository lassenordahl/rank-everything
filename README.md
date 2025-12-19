# Rank Everything

A real-time multiplayer party game where players rank items 1-10. Create a room, invite friends, submit items, and see whose rankings are the wildest.

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Cloudflare account (for deployment)

### Setup

```bash
# Install dependencies
pnpm install

# Build shared packages
pnpm --filter "@rank-everything/shared-types" --filter "@rank-everything/db-schema" build

# Start local development
pnpm rank dev
```

### Environment Variables

Create `.env` files as needed:

```bash
# apps/api/.dev.vars (for local development)
ANTHROPIC_API_KEY=sk-ant-...
```

## CLI Commands

The `rank` CLI provides tools for development, testing, and deployment:

```bash
pnpm rank <command>
```

| Command | Description |
|---------|-------------|
| `setup` | Initialize dev environment (install, migrate, seed) |
| `dev` | Start local development servers |
| `db migrate` | Run database migrations |
| `db seed` | Seed test data |
| `db reset` | Reset database |
| `test` | Run tests |
| `test:spec` | Run spec compliance tests |
| `room create` | Create a test room |
| `room simulate` | Simulate a full game |
| `deploy` | Deploy to Cloudflare |
| `deploy --prod` | Deploy to production |

Use `pnpm rank --help` for full command reference.

## Project Structure

```
apps/
  api/          # PartyKit server + Cloudflare Workers
  web/          # React frontend
  cli/          # Development CLI

packages/
  shared-types/ # TypeScript types
  db-schema/    # Database schemas & migrations

specs/          # Detailed specifications
```

## Documentation

| Document | Description |
|----------|-------------|
| [specs/PROJECT_SPEC.md](specs/PROJECT_SPEC.md) | Full product specification (features, flows, data models, API) |
| [specs/CLI_SPEC.md](specs/CLI_SPEC.md) | CLI tool reference and development workflows |
| [CLAUDE.md](CLAUDE.md) | Development context for Claude Code |

## Tech Stack

- **Frontend**: React + Vite + Tailwind + shadcn/ui
- **Backend**: Cloudflare Workers + PartyKit (Durable Objects)
- **Database**: Cloudflare D1 (SQLite) + KV
- **Real-time**: WebSockets via PartyKit
- **Monorepo**: Turborepo + pnpm

## How to Play

1. One player creates a room and gets a 4-letter code
2. Friends join using the code
3. Players take turns submitting items (anything goes!)
4. Everyone privately ranks each item 1-10 (1 = best)
5. After 10 items, see everyone's rankings and compare

## Development

```bash
# Run tests
pnpm rank test

# Watch mode
pnpm rank test --watch

# Simulate a full game
pnpm rank room simulate --players 4
```

## Deployment

```bash
# Preview deployment
pnpm rank deploy --preview

# Production deployment
pnpm rank deploy --prod
```

## License

Private project.
