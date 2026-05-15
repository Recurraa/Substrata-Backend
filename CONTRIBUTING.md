# Contributing to Substrata

> **[← Back to README](README.md)**

Thank you for your interest in contributing! Substrata is an open-source project and we welcome contributions of all kinds — bug fixes, new features, documentation improvements, and more.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

---

## Code of Conduct

Be respectful. We follow the [Contributor Covenant](https://www.contributor-covenant.org/). Harassment, discrimination, or hostile behaviour will not be tolerated.

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- PostgreSQL ≥ 14
- Redis ≥ 7
- A Stellar testnet account

### Local setup

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/<your-username>/substrata-backend.git
cd substrata-backend

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env — set DATABASE_URL, REDIS_URL, and STELLAR_TREASURY_SECRET_KEY
# Set TEST_MODE=true to skip real Stellar transactions during development

# 4. Run database migrations
npm run db:migrate
npm run db:generate

# 5. Start the dev server
npm run dev
```

---

## Development Workflow

```bash
# Start API server with hot reload
npm run dev

# Start billing scheduler (separate terminal)
npx tsx src/scheduler.ts

# Run tests
npm test

# Type-check without emitting
npx tsc --noEmit

# Lint
npm run lint

# Format
npm run format
```

### Environment tips

- Set `TEST_MODE=true` in `.env` — no real Stellar transactions will be submitted.
- Use `LOG_LEVEL=debug` for verbose output.
- Use `npm run db:studio` to open Prisma Studio and inspect the database.

---

## Project Structure

See [README — Project Structure](README.md#project-structure) for the full layout.

Key conventions:
- **`src/services/`** — pure business logic, no HTTP concerns
- **`src/routes/`** — HTTP layer only; delegate to services
- **`src/workers/`** — queue consumers; delegate to services
- **`src/lib/`** — shared infrastructure (DB, Redis, logger)

---

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]
[optional footer]
```

**Types:**

| Type | When to use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `chore` | Build process, dependency updates |
| `perf` | Performance improvement |

**Examples:**

```
feat(billing): add yearly interval support
fix(payment): handle Stellar sequence number mismatch
docs(api): add wallet verification example
```

---

## Pull Request Process

1. **Branch naming**: `feat/<name>`, `fix/<name>`, `docs/<name>`

2. **Keep PRs focused** — one concern per PR. Large PRs are hard to review.

3. **Before opening a PR:**
   - Run `npx tsc --noEmit` — no type errors
   - Run `npm test` — all tests pass
   - Run `npm run lint` — no lint errors

4. **PR description** should include:
   - What changed and why
   - How to test it
   - Any breaking changes

5. **Review**: at least one maintainer approval is required before merging.

6. **Merging**: we use squash merges to keep the history clean.

---

## Testing

Tests live alongside source files or in a `__tests__/` directory.

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

We use [Vitest](https://vitest.dev/). When adding a feature, include:
- Unit tests for service logic
- At minimum, a smoke test for new routes

For billing logic, use `TEST_MODE=true` and mock Prisma where needed.

---

## Reporting Bugs

Open a [GitHub Issue](https://github.com/your-org/substrata-backend/issues) with:

- **Description** — what happened vs. what you expected
- **Steps to reproduce** — minimal reproduction
- **Environment** — Node version, OS, Stellar network (testnet/mainnet)
- **Logs** — relevant error output (redact any secrets)

---

## Suggesting Features

Open a [GitHub Discussion](https://github.com/your-org/substrata-backend/discussions) or Issue tagged `enhancement`. Describe:

- The problem you're solving
- Your proposed solution
- Alternatives you considered

For large changes, open a discussion first before writing code — it saves everyone time.

---

## Questions?

Open a [GitHub Discussion](https://github.com/your-org/substrata-backend/discussions) or reach out in the community channel.
