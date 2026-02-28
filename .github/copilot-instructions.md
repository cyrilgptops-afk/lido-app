# Lido SaaS – GitHub Copilot Instructions

## Project Overview

Lido is a SaaS automation platform that allows users to deploy and manage bots that integrate with external services (Dropbox, Google Drive, Zoho, etc.). The platform consists of multiple layers: a React/Next.js frontend, a Node.js API gateway, microservice bot engines, a service integration layer, a PostgreSQL/MongoDB database, a background job queue, and a monitoring stack.

---

## Architecture Layers

### 1. Frontend Layer
- **Stack:** React, Next.js (App Router), TailwindCSS or Chakra UI
- **Auth:** OAuth 2.0 via NextAuth.js
- **Real-time:** WebSockets or polling for bot status updates
- **Key Pages:**
  - `/login` – OAuth login flow
  - `/dashboard` – Overview of active bots and services
  - `/bots` – Bot listing, deployment, and management
  - `/settings` – User/org settings
  - `/integrations` – Connect and manage external service integrations

**Copilot guidance:**
- Use the Next.js App Router (`app/` directory) with React Server Components where possible.
- Fetch server-side data using `async` server components; use `"use client"` only when interactivity is needed.
- Use TailwindCSS utility classes for styling; avoid inline styles.
- Centralize API calls in a `/lib/api/` directory with typed fetch wrappers.
- Use `react-query` or SWR for client-side data fetching and caching.
- WebSocket connections should be managed via a custom React hook (e.g., `useSocketStatus`).

---

### 2. API Gateway Layer
- **Stack:** Node.js, Express.js, JWT
- **Responsibilities:** Route requests, validate JWT tokens and scopes, rate limiting, logging
- **Key Endpoints:**
  - `POST /bots/deploy` – Deploy a new bot instance
  - `GET /services/list` – List available integrations
  - `POST /auth/oauth/callback` – Handle OAuth provider callbacks

**Copilot guidance:**
- Structure the Express app using a router-per-resource pattern: `routes/bots.js`, `routes/services.js`, `routes/auth.js`.
- Always validate and sanitize request bodies using `zod` or `joi` schemas before processing.
- JWT validation should be handled in a reusable `authenticate` middleware (`middleware/authenticate.js`).
- Rate limiting should use `express-rate-limit`; apply stricter limits to `/auth` routes.
- Use `morgan` or a structured logger (e.g., `pino`) for request logging.
- Return consistent error response shapes: `{ success: false, error: { code, message } }`.
- Never log sensitive data (tokens, passwords, secrets).

---

### 3. Bot Engine Layer (Microservices)
- **Stack:** Node.js workers, AWS Lambda, or Azure Functions
- **Responsibilities:** Execute automation workflows, handle service-specific logic, retry and error handling
- **Example bots:**
  - `bot-dropbox-sync.js`
  - `bot-google-calendar.js`

**Copilot guidance:**
- Each bot module must export a standard interface: `{ name, version, execute(context), validate(config) }`.
- The `execute(context)` function receives `{ userId, botConfig, credentials, logger }` and returns `{ success, data, error }`.
- Implement exponential backoff for retries; use a shared `withRetry(fn, options)` utility.
- Bot logic should be stateless — persist state to the database, not in memory.
- For serverless deployments, keep cold-start time low: lazy-load heavy SDKs inside `execute()`.
- Every bot must emit structured log events: `{ event, botId, userId, timestamp, meta }`.

---

### 4. Service Integration Layer
- **Stack:** Node.js SDKs, REST APIs, OAuth 2.0
- **Responsibilities:** Connect to external services, token refresh, credential storage, data normalization
- **Security:** Credentials stored in an encrypted vault (AWS Secrets Manager or HashiCorp Vault)

**Copilot guidance:**
- Create a service adapter per integration inside `integrations/` (e.g., `integrations/dropbox.js`, `integrations/google-drive.js`).
- Each adapter must implement: `connect(credentials)`, `refreshToken(tokenData)`, `disconnect(credentials)`.
- Never store raw OAuth tokens in the database; always reference a vault key.
- Use a shared `credentialStore` service to abstract vault interactions (get/set/rotate secrets).
- Normalize all external API responses to a common internal schema before passing data to bots.
- Handle token expiry gracefully: auto-refresh tokens before each API call using a `withTokenRefresh` wrapper.

---

### 5. Database Layer
- **Stack:** PostgreSQL (primary) or MongoDB
- **ORM/ODM:** Prisma (PostgreSQL) or Mongoose (MongoDB)
- **Key Collections / Tables:**
  - `users` – User profiles and org memberships
  - `bots` – Bot configurations and deployment metadata
  - `services` – Connected service integrations per user
  - `logs` – Bot execution logs with status and output
  - `tokens` – Encrypted credential references (vault keys, not raw tokens)

**Copilot guidance:**
- Use Prisma for PostgreSQL; define all models in `prisma/schema.prisma`.
- Always use database transactions for operations that touch multiple tables.
- Add indexes on frequently queried fields: `userId`, `botId`, `status`, `createdAt`.
- Sensitive fields (e.g., vault keys) should be stored in a dedicated encrypted column or as references only.
- Use soft deletes (add `deletedAt` timestamp) rather than hard deletes for `bots` and `services`.
- Write migration files for every schema change; never mutate the schema directly in production.

---

### 6. Background Jobs & Queue Layer
- **Stack:** BullMQ (Redis), Agenda.js, or RabbitMQ
- **Responsibilities:** Schedule bot runs, retry failed jobs, queue service calls

**Copilot guidance:**
- Use BullMQ as the primary job queue; define each job type in `jobs/` (e.g., `jobs/syncDropbox.js`).
- All job handlers must be idempotent — running the same job twice should not cause duplicate effects.
- Job payloads should be minimal: pass IDs, not full objects. Fetch fresh data inside the worker.
- Set sensible retry limits (e.g., 3 attempts) and dead-letter queue behavior for permanently failed jobs.
- Log every job lifecycle event: `waiting → active → completed / failed`.
- Use BullMQ's `repeat` option for scheduled/cron-style bot runs; store the cron expression in the `bots` table.

---

### 7. Monitoring & Admin Layer
- **Stack:** Prometheus + Grafana, Sentry
- **Responsibilities:** Track bot health and uptime, alert on failures, admin panel for support

**Copilot guidance:**
- Expose a `/metrics` endpoint (Prometheus-compatible) from the API gateway using `prom-client`.
- Define and track key metrics: `bot_execution_total`, `bot_execution_errors_total`, `job_queue_depth`, `api_request_duration_seconds`.
- Use Sentry for exception tracking; initialize Sentry at app startup in both the frontend and backend.
- Wrap all bot `execute()` calls in a try/catch that reports errors to Sentry with bot and user context.
- The admin panel should be a protected Next.js route group `(admin)/` requiring an `admin` role claim in the JWT.

---

## General Coding Standards

- **Language:** TypeScript everywhere (frontend, API gateway, bot engine, integrations).
- **Linting:** ESLint with `@typescript-eslint` + Prettier for formatting.
- **Testing:** Jest for unit tests; Supertest for API integration tests. Aim for >80% coverage on critical paths (bot execution, auth, queue handlers).
- **Environment Variables:** Never hardcode secrets. Use `.env` files locally and a secrets manager in production. Validate all env vars at startup with `zod`.
- **Error Handling:** All async functions must handle errors explicitly. Prefer `Result<T, E>` patterns over throwing uncaught exceptions in business logic.
- **Logging:** Use structured JSON logging (`pino` or `winston`). Include `requestId`, `userId`, and `botId` in every log entry where applicable.
- **API Responses:** Always return `{ success: true, data }` on success and `{ success: false, error: { code, message } }` on failure.
- **Security:** Sanitize all user input; apply OWASP best practices; never expose stack traces to clients.

---

## Directory Structure Reference

```
lido-app/
├── apps/
│   ├── web/                  # Next.js frontend
│   └── api/                  # Express API gateway
├── packages/
│   ├── bot-engine/           # Bot execution runtime
│   ├── integrations/         # Service adapters (Dropbox, Google, Zoho…)
│   ├── queue/                # BullMQ job definitions and workers
│   ├── db/                   # Prisma schema, migrations, client
│   └── shared/               # Shared types, utilities, constants
├── infra/                    # IaC (Terraform / CDK)
├── .github/
│   ├── copilot-instructions.md
│   └── workflows/            # CI/CD pipelines
└── docker-compose.yml
```

---

## Key Conventions for Copilot Suggestions

1. **Always prefer TypeScript** over JavaScript for new files.
2. **Validate at boundaries** — validate inputs at the API gateway and at the top of each bot's `execute()`.
3. **Don't trust external APIs** — always handle network errors, unexpected response shapes, and rate limits.
4. **Keep bots small and focused** — one bot = one integration workflow. Compose complex flows from smaller bots.
5. **Prefer composition over inheritance** — use utility functions and adapters, not deep class hierarchies.
6. **Document integrations** — every service adapter file must have a JSDoc comment describing auth requirements and API version.
