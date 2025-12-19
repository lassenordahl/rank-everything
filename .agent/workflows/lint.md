---
description: How to fix lint errors before committing
---

// turbo-all

1. Run `pnpm lint:fix` to auto-fix lint issues
2. Run `pnpm tsc -p apps/web --noEmit` to check web types
3. Run `pnpm tsc -p apps/api --noEmit` to check api types
4. Run `pnpm test:all` to verify tests pass
