# Lido SaaS – GitHub Copilot Instructions

## Project Overview

Lido is a SaaS automation platform that allows users to deploy and manage bots that integrate with external services (Dropbox, Google Drive, Zoho, etc.). The platform consists of multiple layers: a React/Next.js frontend (Pages Router), a Node.js/Express API gateway, microservice bot engines, a service integration layer, a MySQL database, a MinIO object-storage layer, a Redis cache/queue, and a monitoring stack.

---

## Architecture Layers

### 1. Frontend Layer
- **Stack:** React, Next.js **Pages Router** (`pages/` directory), Material UI v5 (Sneat-inspired theme, primary `#696cff`)
- **Auth:** JWT stored client-side; passed as `Authorization: Bearer <token>` header
- **Admin UI:** Protected pages under `pages/admin/` — uses `AdminLayout` + `adminTheme` from `components/layouts/AdminLayout.tsx`
- **Key Pages:**
  - `/login` – JWT login flow
  - `/dashboard` – Overview of active bots and services
  - `/bots` – Bot listing, deployment, and management
  - `/settings` – User/org settings
  - `/integrations` – Connect and manage external service integrations
  - `/admin/users` – Admin CRUD for users
  - `/admin/organizations` – Admin CRUD for organizations (includes logo upload via MinIO)
  - `/admin/members` – Admin org membership management
  - `/storefront/[slug]` – Public storefront page per organization

**Copilot guidance:**
- This project uses the **Pages Router** — do NOT use the `app/` directory or React Server Components.
- All admin pages must wrap content in `<AdminLayout>` and apply `adminTheme` tokens for consistent styling.
- Use MUI `sx` prop with `adminTheme` constants (colors, typography, spacing) rather than inline styles or Tailwind.
- Centralize API calls under `lib/api/`; use typed `fetch` wrappers — no raw `fetch` scattered in page components.
- For presigned image URLs (MinIO assets), always resolve through `POST /api/admin/storage/url` and cache the result in a **module-level `Map`** with a 1-hour TTL. Never store raw MinIO keys directly in `<img src>` or `Avatar src`.
- Cache entries must be busted (`_cache.delete(key)`) immediately after a file delete or replace operation.

---

### 2. API Gateway Layer
- **Stack:** Node.js, Express.js 4.x, TypeScript, JWT (`jsonwebtoken`), `pino` structured logging
- **Responsibilities:** Route requests, validate JWT tokens and scopes, rate limiting, logging, file upload proxying to MinIO
- **Key route files** (`apps/api/src/routes/`):
  - `auth.ts` – login / token refresh
  - `bots.ts` – bot CRUD and deploy
  - `services.ts` – list available integrations
  - `admin.ts` – admin CRUD for users, organizations, members; mounts `storageRouter` at `/admin/storage`
  - `storage.ts` – generic MinIO file operations (upload, presigned URL, delete, list)
  - `health.ts` – liveness / readiness probe

**Copilot guidance:**
- Follow the **router-per-resource** pattern; each file exports a single `Router` instance.
- JWT validation lives in `middleware/authenticate.ts` — exports `authenticate` (any valid JWT) and `requireRole(...roles)` (role guard). Always apply `authenticate` before `requireRole`.
- The `JwtPayload` shape is `{ sub: string, email: string, role: 'user' | 'admin' }`. Admin-only routes must call `requireRole('admin')`.
- Validate request bodies with `zod` schemas before processing; return `400` with `{ success: false, error: { code, message } }` on validation failure.
- Use `pino` via `lib/logger.ts` for structured logging; include `requestId`, `userId`, `orgId` in every relevant log entry.
- **Never** log secrets, tokens, or passwords. Use `lib/response.ts` helpers — `successResponse(data)` and `errorResponse(code, message)` — for all JSON responses.
- Rate limit `/auth` routes more aggressively than general routes using `express-rate-limit`.

---

### 3. Storage Layer (MinIO)
- **Stack:** MinIO 8.x object storage, `minio` Node.js SDK, adapter pattern
- **Adapter interface:** `StorageAdapter` defined in `apps/api/src/lib/storage/adapter.ts`
  - Methods: `initialize()`, `upload()`, `download()`, `getPresignedUrl()`, `delete()`, `list()`, `exists()`, `healthCheck()`
  - All methods return `Result`-style objects (`{ success, data?, error? }`) — never throw
- **Implementation:** `MinioAdapter` in `apps/api/src/lib/storage/minio.adapter.ts` implements `StorageAdapter`
- **Factory / singleton:** `getStorageClient()` in `apps/api/src/lib/storage/index.ts` — reads `storageConfig` from central config and returns the configured adapter singleton
- **Buckets** (configured via env vars):
  - `lido-bots` – bot-related assets
  - `lido-uploads` – generic user uploads (50 MB max per file)
  - `lido-assets` – org logos, product images, public assets (images, any type up to 50 MB)
  - `lido-cache` – ephemeral cache files (auto-deleted after 7 days via MinIO lifecycle policy)
- **Storage API routes** (`POST /admin/storage/upload`, `POST /admin/storage/url`, `DELETE /admin/storage/delete`, `GET /admin/storage/list`):
  - Files are **never tracked in the database** — only the MinIO object key (`bucket/path/filename-timestamp.ext`) is stored as a reference (e.g., `organizations.logo_url`)
  - `POST /url` generates a 7-day presigned GET URL and caches it server-side for 1 hour (`Cache-Control: private, max-age=3600`)
  - `DELETE /delete` removes the object and immediately busts the server-side URL cache entry
- **Presigned URL caching (backend):** module-level `Map<string, { url, expiresAt }>` in `storage.ts`; TTL = 1 hour; helpers `getCachedUrl / setCachedUrl / bustCachedUrl`

**Copilot guidance:**
- Always add new storage implementations as a new class that implements `StorageAdapter` (e.g., `S3Adapter`). Register it in the factory switch in `lib/storage/index.ts`.
- Never call `minio` SDK methods directly from route handlers — always go through the adapter.
- Store only the **object key** (not the presigned URL) in the database. Resolve URLs at read time via `POST /admin/storage/url`.
- Apply client-side URL caching (`_logoCache` module-level Map, 1-hour TTL) on the frontend for any page that renders MinIO-backed images in a list. Bust on delete/replace.
- The `cache` bucket has a 7-day MinIO lifecycle rule applied automatically on `initialize()` — use it for temporary processing artifacts.

---

### 4. Bot Engine Layer (Microservices)
- **Stack:** Node.js workers, AWS Lambda, or Azure Functions
- **Responsibilities:** Execute automation workflows, handle service-specific logic, retry and error handling

**Copilot guidance:**
- Each bot module must export a standard interface: `{ name, version, execute(context), validate(config) }`.
- The `execute(context)` function receives `{ userId, botConfig, credentials, logger }` and returns `{ success, data, error }`.
- Implement exponential backoff for retries; use a shared `withRetry(fn, options)` utility.
- Bot logic must be stateless — persist state to the database, not in memory.
- For serverless deployments, keep cold-start time low: lazy-load heavy SDKs inside `execute()`.
- Every bot must emit structured log events: `{ event, botId, userId, timestamp, meta }`.

---

### 5. Service Integration Layer
- **Stack:** Node.js SDKs, REST APIs, OAuth 2.0
- **Responsibilities:** Connect to external services, token refresh, credential storage, data normalization
- **Security:** Credentials stored in an encrypted vault (AWS Secrets Manager or HashiCorp Vault)

**Copilot guidance:**
- Create a service adapter per integration inside `packages/integrations/` (e.g., `integrations/dropbox.ts`).
- Each adapter must implement: `connect(credentials)`, `refreshToken(tokenData)`, `disconnect(credentials)`.
- Never store raw OAuth tokens in the database; always reference a vault key.
- Use a shared `credentialStore` service to abstract vault interactions (get/set/rotate secrets).
- Normalize all external API responses to a common internal schema before passing data to bots.
- Handle token expiry gracefully: auto-refresh tokens before each API call using a `withTokenRefresh` wrapper.

---

### 6. Database Layer
- **Stack:** MySQL (primary), `mysql2` driver, raw SQL via `db.query()` / `db.queryRaw()` / `db.queryOne()`
- **Migration files:** `apps/api/db/migrations/` — numbered SQL files (e.g., `001_create_users_schema.sql`)
- **Key Tables:**
  - `users` – `id, uuid, email, password_hash, role, status, created_at, deleted_at`
  - `organizations` – `id, uuid, name, slug, logo_url TEXT NULL, created_at, deleted_at`
  - `user_organizations` – membership join table with `role`
  - `bots` – bot configurations and deployment metadata
  - `logs` – bot execution logs

**Copilot guidance:**
- Use raw SQL with parameterized queries (`?` placeholders) via the `db` client in `lib/db.ts`. No ORM is in use.
- Always use `db.queryRaw()` for `INSERT`/`UPDATE`/`DELETE` statements where you need `affectedRows`; use `db.queryOne()` for single-row `SELECT`.
- Apply soft deletes (`deleted_at IS NULL` filter on all reads; `SET deleted_at = NOW()` on delete) for `users`, `organizations`, `bots`.
- Add indexes on frequently queried fields: `uuid`, `email`, `slug`, `status`, `created_at`.
- Write a new numbered migration file for every schema change; never mutate the schema in production directly.
- The `logo_url` column on `organizations` stores the **MinIO object key** (e.g., `organizations/42/logo-1709123456789.png`), not a presigned URL.

---

### 7. Config Layer
- **Central export:** `apps/api/src/config/index.ts` re-exports all config modules
- **Modules:**
  - `database.config.ts` – MySQL connection settings
  - `storage.config.ts` – MinIO adapter config, validated with `zod`; buckets schema: `{ bots, uploads, assets, cache }`
  - `cache.config.ts` – Redis connection settings
  - `swagger.config.ts` – OpenAPI / Swagger setup
- **Env validation:** `apps/api/src/lib/env.ts` validates all env vars at startup with `zod`; process exits on hard failure for critical vars

**Copilot guidance:**
- All new env vars must be added to the `envSchema` in `lib/env.ts` with a `z` type and sensible default where applicable.
- New config domains must get their own `*.config.ts` file, validated with `zod`, and re-exported from `config/index.ts`.
- Access config via the central barrel — `import { storageConfig, cacheConfig } from '../config'` — never read `process.env` directly outside of `lib/env.ts`.

---

### 8. Background Jobs & Queue Layer
- **Stack:** Redis (`redis` v4), BullMQ (planned)
- **Responsibilities:** Schedule bot runs, retry failed jobs, queue service calls

**Copilot guidance:**
- Use BullMQ as the primary job queue; define each job type in `packages/queue/` (e.g., `jobs/syncDropbox.ts`).
- All job handlers must be idempotent — running the same job twice must not cause duplicate effects.
- Job payloads should be minimal: pass IDs, not full objects. Fetch fresh data inside the worker.
- Set sensible retry limits (e.g., 3 attempts) and dead-letter queue behavior for permanently failed jobs.
- Log every job lifecycle event: `waiting → active → completed / failed`.
- Use BullMQ's `repeat` option for scheduled/cron-style bot runs; store the cron expression in the `bots` table.

---

### 9. Monitoring & Admin Layer
- **Stack:** Prometheus + Grafana (planned), Sentry (planned)
- **Admin panel:** Pages under `pages/admin/` — protected by `authenticate` + `requireRole('admin')` middleware on every `/admin/*` API route

**Copilot guidance:**
- Expose a `/metrics` endpoint (Prometheus-compatible) from the API gateway using `prom-client`.
- Define and track key metrics: `bot_execution_total`, `bot_execution_errors_total`, `job_queue_depth`, `api_request_duration_seconds`.
- Use Sentry for exception tracking; initialize at app startup in both frontend and backend.
- Wrap all bot `execute()` calls in a try/catch that reports to Sentry with bot and user context.
- The admin frontend at `pages/admin/` enforces role via client-side redirect; the API enforces it server-side via `requireRole('admin')`.

---

## General Coding Standards

- **Language:** TypeScript everywhere — frontend, API gateway, storage adapters, bot engine, integrations.
- **Linting:** ESLint with `@typescript-eslint` + Prettier.
- **Testing:** Jest for unit tests; Supertest for API integration tests. Aim for >80% coverage on critical paths (bot execution, auth, storage, queue handlers).
- **Environment Variables:** Never hardcode secrets. Use `.env` locally; validate all vars at startup in `lib/env.ts` with `zod`. Never read `process.env` outside `env.ts`.
- **Error Handling:** All async functions must handle errors explicitly. Prefer `Result<T, E>` patterns (`{ success, data?, error? }`) over throwing in business logic.
- **Logging:** Use `pino` structured JSON logging via `lib/logger.ts`. Include `requestId`, `userId`, `orgId`, and `botId` in every relevant log entry.
- **API Responses:** Always use `successResponse(data)` / `errorResponse(code, message)` from `lib/response.ts`. Shape: `{ success: true, data }` or `{ success: false, error: { code, message } }`.
- **Security:** Sanitize all user input; apply OWASP best practices; never expose stack traces to clients; never log secrets or tokens.
- **Multer:** Pin `@types/multer` to `1.4.12` to avoid Express type version conflicts. Use `multer.memoryStorage()` — never write uploads to disk.

---

## Directory Structure Reference

```
lido-app/
├── apps/
│   ├── web/                        # Next.js frontend (Pages Router)
│   │   ├── pages/
│   │   │   ├── admin/              # Admin CRUD pages (users, orgs, members)
│   │   │   ├── storefront/         # Public storefront pages
│   │   │   └── api/storefront/     # Next.js API routes (storefront proxy)
│   │   ├── components/layouts/     # AdminLayout, DashboardLayout
│   │   └── lib/
│   │       ├── api/client.ts       # Typed fetch wrappers
│   │       └── storefront/         # Storefront theme/config helpers
│   └── api/                        # Express API gateway
│       ├── src/
│       │   ├── config/             # Centralized zod-validated configs (storage, db, cache, swagger)
│       │   ├── lib/
│       │   │   ├── env.ts          # Zod env schema — single source for process.env
│       │   │   ├── db.ts           # MySQL client (query / queryRaw / queryOne)
│       │   │   ├── redis.ts        # Redis client
│       │   │   ├── logger.ts       # Pino logger instance
│       │   │   ├── response.ts     # successResponse / errorResponse helpers
│       │   │   └── storage/
│       │   │       ├── adapter.ts       # StorageAdapter interface + result types
│       │   │       ├── minio.adapter.ts # MinioAdapter implements StorageAdapter
│       │   │       └── index.ts         # Factory (getStorageClient) + singleton
│       │   ├── middleware/
│       │   │   ├── authenticate.ts  # JWT auth + requireRole guard
│       │   │   ├── errorHandler.ts
│       │   │   ├── requestId.ts
│       │   │   └── validate.ts
│       │   ├── models/             # TypeScript interfaces for DB rows
│       │   ├── repositories/       # Data-access functions (user, user-organization)
│       │   └── routes/
│       │       ├── admin.ts        # Admin CRUD; mounts storageRouter at /admin/storage
│       │       ├── storage.ts      # Generic storage: upload, url, delete, list
│       │       ├── auth.ts
│       │       ├── bots.ts
│       │       ├── services.ts
│       │       └── health.ts
│       └── db/migrations/          # Numbered SQL migration files
├── packages/
│   ├── bot-engine/                 # Bot execution runtime
│   ├── integrations/               # Service adapters (Dropbox, Google, Zoho…)
│   ├── queue/                      # BullMQ job definitions and workers
│   ├── db/                         # Shared DB utilities
│   └── storage/                    # Shared MinIO StorageClient (packages/storage/src/client.ts)
├── infra/                          # IaC (Terraform / CDK)
├── .github/
│   ├── copilot-instructions.md
│   └── workflows/                  # CI/CD pipelines
└── docker-compose.yml
```

---

## Key Conventions for Copilot Suggestions

1. **Always prefer TypeScript** over JavaScript for all new files.
2. **Validate at boundaries** — validate inputs at the API gateway with `zod` and at the top of each bot's `execute()`.
3. **Adapter pattern for storage** — never call MinIO SDK methods directly from route handlers; always use the `StorageAdapter` interface. To add a new provider, implement `StorageAdapter` and register in the factory.
4. **Keys not URLs in the DB** — store MinIO object keys in the database, resolve presigned URLs at read time via `POST /admin/storage/url`, and cache them with a 1-hour TTL.
5. **Don't trust external APIs** — always handle network errors, unexpected response shapes, and rate limits.
6. **Keep bots small and focused** — one bot = one integration workflow. Compose complex flows from smaller bots.
7. **Prefer composition over inheritance** — use utility functions and adapters, not deep class hierarchies.
8. **Document integrations** — every service adapter file must have a JSDoc comment describing auth requirements and API version.
9. **Central config barrel** — always import config from `apps/api/src/config` (the barrel), never directly from individual config files or `process.env`.
10. **Soft deletes** — use `deleted_at IS NULL` guards on all reads; set `deleted_at = NOW()` instead of `DELETE` for `users`, `organizations`, and `bots`.
