# fit-PRO

A personal training journal for logging workouts, meals, hydration, and body measurements. The dashboard shows recorded activity and progress over time. Optional Gemini coaching and meal and workout plans use the athlete’s profile.

## Run locally

Use Node.js 24, MongoDB, and Redis. From the repository root:

```sh
npm ci
cp .env.example .env
```

In PowerShell, use `Copy-Item .env.example .env` for the second command. Configure the database URI, Redis URL, and separate access and refresh token secrets. Set `APP_URL` to the address you use in the browser. Mailtrap handles verification emails for real accounts. Mock email is available for automated tests.

```sh
docker compose up -d mongodb redis
npm run seed
npm run dev
```

Open the app at [localhost:3000](http://localhost:3000). Start `npm run worker:dev` in another terminal for queued email, notifications, and leaderboard jobs. Configure `GEMINI_API_KEY` to use live AI features.

## Project layout

| Directory | Responsibility |
| --- | --- |
| `src/app` | Next.js pages and API route handlers |
| `src/features` | Feature UI, hooks, and calculations |
| `src/components` | Shared navigation, providers, and shadcn components |
| `src/models` and `src/validators` | MongoDB models and request schemas |
| `src/lib` | Authentication, providers, caching, and queue integrations |
| `src/workers` | Background processors and schedules |
| `scripts` | Catalog seeds, reconciliation, and worker build |
| `tests` | Unit, component, API, integration, and browser tests |

## Verify a change

Set `MONGODB_URI_TEST` to a dedicated database such as `mongodb://127.0.0.1:27017/fit-pro-test`. Use a disposable Redis instance for integration and browser tests. Playwright seeds the test catalog and starts its own web server on port 3100.

```sh
npm run lint
npx tsc --noEmit
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

## 📚 Documentation Reference

- **[Configuration Guide](docs/configuration.md)**: Environment variable definitions, test database safety, email providers, and troubleshooting.
- **[Deployment Runbook](docs/deployment.md)**: Production prerequisites, container builds, system architecture, catalog seeding, and deployment verification checklist.

---

## 📡 API Reference Overview

All API endpoints return a standardized, uniform response envelope:
```json
{
  "statusCode": 200,
  "message": "Operation successful",
  "data": { ... },
  "success": true,
  "errors": [],
  "diagnosticReport": null
}
```

### Core Endpoints

| Category | Method | Endpoint | Auth | Description |
| :--- | :---: | :--- | :---: | :--- |
| **Auth** | `POST` | `/api/auth/register` | No | User registration with non-enumerating responses |
| **Auth** | `POST` | `/api/auth/login` | No | User authentication returning 200 with HTTP-only cookies |
| **Auth** | `POST` | `/api/auth/logout` | Yes | Clears session cookies and invalidates refresh token |
| **Auth** | `POST` | `/api/auth/refresh` | No | Rotates access/refresh tokens with rotation grace window |
| **Auth** | `GET` | `/api/auth/me` | Yes | Hydrates current authenticated user and profile status |
| **Auth** | `POST` | `/api/auth/verify-email` | No | Verifies email via JSON token body (Client-side) |
| **Auth** | `GET` | `/api/auth/verify-email/[token]`| No | Verifies email via URL parameter (Email link redirect) |
| **Auth** | `POST` | `/api/auth/resend-verification` | No | Rate-limited non-enumerating verification resend |
| **Auth** | `POST` | `/api/auth/forgot-password` | No | Rate-limited non-enumerating reset link dispatch |
| **Auth** | `POST` | `/api/auth/reset-password/[token]` | No | Resets account password using 15-minute token |
| **Auth** | `POST` | `/api/auth/change-password` | Yes | Updates password verifying previous credentials |
| **Auth** | `POST` | `/api/auth/google` | No | Google OAuth token verification and account linking |
| **Auth** | `POST` | `/api/auth/microsoft` | No | Microsoft OAuth token verification (oid/sub+tid) |
| **Profile** | `GET` | `/api/profile` | Yes | Retrieves current user profile with derived age |
| **Profile** | `POST` | `/api/profile` | Yes | Onboarding setup; creates Profile & Day-1 BMI record |
| **Profile** | `PATCH`| `/api/profile` | Yes | Partial update with validation & BMR/TDEE re-calculation |
| **Dashboard** | `GET` | `/api/dashboard/stats` | Yes | Timezone-aware streak, macro targets, and trend charts |
| **BMI** | `GET` | `/api/bmi` | Yes | Historical BMI logs (Returns 200 with `[]` if empty) |
| **BMI** | `POST` | `/api/bmi` | Yes | Logs weight, recalculates BMI category with zero gaps |
| **Water** | `GET` | `/api/water/today` | Yes | Timezone-aware today's consumption vs 3000ml target |
| **Water** | `POST` | `/api/water` | Yes | Logs water intake in ml (supports optional backdated date within last 7 days) |
| **Water** | `DELETE`| `/api/water/[id]` | Yes | Deletes logged water entry (Owner-restricted) |
| **Catalog** | `GET` | `/api/exercises` | Yes | Paginated exercise catalog with muscle/equipment filters |
| **Catalog** | `GET` | `/api/foods` | Yes | Paginated food catalog with dietary/mealType filters |
| **Workout** | `GET` | `/api/workout` | Yes | Paginated workout history with compound index optimization |
| **Workout** | `POST` | `/api/workout` | Yes | Logs workout session validating exercise existence |
| **Workout** | `DELETE`| `/api/workout/[id]` | Yes | Deletes logged workout (Owner-restricted) |
| **Meal** | `GET` | `/api/meal` | Yes | Paginated meal history |
| **Meal** | `POST` | `/api/meal` | Yes | Logs meal calculating calories/macros server-side |
| **Meal** | `DELETE`| `/api/meal/[id]` | Yes | Deletes logged meal (Owner-restricted) |
| **AI** | `POST` | `/api/workout/ai/generate` | Yes | Generates 7-day workout split; deactivates previous plans |
| **AI** | `GET` | `/api/workout/ai/savedplan` | Yes | Retrieves current active workout plan |
| **AI** | `POST` | `/api/meal/ai/generate` | Yes | Generates daily meal plan; deactivates previous plans |
| **AI** | `GET` | `/api/meal/ai/savedplan` | Yes | Retrieves current active meal plan |
| **AI** | `POST` | `/api/ai/chat` | Yes | Legacy JSON AI Chat endpoint |
| **AI** | `POST` | `/api/coach` | Yes | High-performance real-time SSE streaming coach endpoint |

---

## ⚡ Redis Infrastructure & Caching Architecture

Fit-PRO uses a centralized Redis infrastructure layer (`src/lib/redis/client.ts` and `src/lib/cache/redis-cache.ts`) designed for resilient high-throughput operations.

### 1. Connection Architecture
- **Process Singleton**: A single Redis connection is shared across the entire Node.js process.
- **Lazy Connection & Bounded Retries**: `lazyConnect: true`, `enableOfflineQueue: false`, `maxRetriesPerRequest: 1`, and `commandTimeout: 3000ms` ensure connection attempts fail fast rather than stalling request lifecycles.
- **Server-Only Boundary**: Redis is used strictly in Node.js server runtimes, never in Edge runtime modules.

### 2. Distributed Rate Limiting & Fail-Open Policy
- **Atomic Sliding Window**: Evaluated via server-side Redis Lua scripts (`PTTL` + `INCR` + `PEXPIRE`) to guarantee atomicity under high concurrent load.
- **Fail-Open Policy**: When Redis is unavailable or disconnected, rate limiting fails open (`allowed: true`, remaining quota 1). This architectural trade-off prioritizes end-user availability and prevents transient infrastructure outages from blocking critical user logins or health logging, while logging errors with full observability.

### 3. Catalog Snapshot Caching
- **Cached Datasets**:
  - Complete Exercise Catalog (`catalog:exercises:snapshot:v{version}`)
  - Active Food Items Catalog (`catalog:foods:snapshot:v{version}`)
- **TTL**: 600 seconds (10 minutes).
- **Execution Model**: The full dataset snapshot is cached in Redis; client filtering (`q`, `targetMuscle`, `equipment`, `category`, `mealType`, `dietaryPreference`), case-insensitive alias matching, sorting, and pagination are executed in memory with zero MongoDB load on cache hits.
- **Invalidation Strategy**: O(1) versioned namespace invalidation (`cache:v:catalog:exercises` and `cache:v:catalog:foods`). Invalidation triggers when actual writes occur during:
  - `scripts/seed-exercises.ts` (live seed only; skipped on dry run)
  - `scripts/seed-meals.ts` (live seed only; skipped on dry run)
  - `src/lib/ai/plan-helpers.ts` (when novel exercises or foods are upserted into the catalog)

### 4. User Dashboard Caching
- **Cached Dataset**: Complete computed dashboard summary (`dashboard:{userId}:v{version}:{timeZone}`).
- **TTL**: 30 seconds.
- **Cache Isolation**: Strongly isolated by authenticated user ID and client timezone. Private metrics are never shared across users.
- **Baseline BMI Auto-Seeding**: Preserves automatic initial Day-1 BMI creation on cache misses when profile metrics are present.
- **Comprehensive Invalidation Coverage**: Instant O(1) version increment (`cache:v:dashboard:{userId}`) executed across all 9 mutation paths:
  1. `POST /api/workout`
  2. `DELETE /api/workout/[id]`
  3. `POST /api/meal`
  4. `DELETE /api/meal/[id]`
  5. `POST /api/water`
  6. `DELETE /api/water/[id]`
  7. `POST /api/profile`
  8. `PATCH /api/profile`
  9. `POST /api/bmi`

### 5. Redis Outage & Failure Recovery
- **Transparent MongoDB Fallback**: If Redis reads, writes, or connections fail, the application falls back directly to MongoDB without surfacing errors to users.
- **Safe Invalidation**: Invalidation failures are caught and logged; they never convert a successfully persisted database write into an HTTP 500 error. The bounded TTL ensures eventual consistency in the worst case.

### 6. Observability & Logging
- `debug`: `Cache hit` with `key`.
- `info`: `Cache miss` with `key` and `ttlSeconds`.
- `info`: `Cache namespace invalidated` with `namespace` and `newVersion`.
- `warn`: `Cache read error; treating as miss` or `Cache write error`.
- Sensitive data, tokens, passwords, and serialized bodies are never logged.

---

## 🧪 Enterprise Testing Suite (Showcase)

This application includes a production-grade testing suite designed to showcase testing maturity and software craftsmanship across all levels of the testing pyramid.

| Layer | Runner & Tools | Test Target | Key Highlights |
| :--- | :--- | :--- | :--- |
| **Unit** | Vitest 5 | `tests/unit/` | Zod schema validation boundaries, bcrypt 72-byte caps, Mifflin-St Jeor BMR math, JWT HS256 tokens, Redis cache utility |
| **Component** | Testing Library + Happy-DOM | `tests/components/` | Form submissions, loading spinners, password visibility toggles, reactive metric cards |
| **API & Contract** | Vitest 5 | `tests/api/` | Standardized envelopes (200–500), atomic Redis rate limiting & fail-open policy, catalog caching, dashboard caching |
| **DB Integration** | Vitest + Isolated Test DB | `tests/integration/` | Real MongoDB persistence, deterministic exercise reconciliation fixtures, dry-run zero-write validation, isolated teardown |
| **E2E Journeys** | Playwright 1.64 | `tests/e2e/` | 4 critical user flows: Auth lifecycle, Biometrics & BMI, Daily hydration tracking, Gemini AI Coach |


### Test Commands
```bash
# Run all Unit, Component, API, and Integration suites (100% pass)


# Run Playwright End-to-End browser journeys
npm run test:e2e

# Run with interactive UI
npm run test:watch
```

For full architecture details, coverage tables, and design decisions, see the dedicated [tests/README.md](tests/README.md).

---


---

## 🚀 Local Development & Setup Workflow

Fit-PRO is designed to run entirely locally without requiring external cloud deployment.

### 1. Prerequisites
- **Node.js**: v22+ (tested with v24.x)
- **MongoDB**: Local MongoDB instance (port 27017) or MongoDB Atlas connection string.
- **Redis**: Redis 7+ instance (port 6379, required for BullMQ queues and Streams).
- **Docker** (optional): You can run Redis and MongoDB via Docker:
  ```bash
  docker run -d --name fit-pro-redis -p 6379:6379 redis:7-alpine
  ```

### 2. Installation
```bash
npm install --legacy-peer-deps
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Key configuration variables:
- `EMAIL_PROVIDER=mock`: Default for tests and local dev. No live API tokens needed.
- `MONGODB_URI`: Local or cloud MongoDB connection string.
- `REDIS_URL`: Local Redis connection string (e.g. `redis://127.0.0.1:6379`).
- `ACCESS_TOKEN_SECRET` / `REFRESH_TOKEN_SECRET`: Minimum 32-character secrets.

### 4. Database Seeding
Populate the exercise and food catalogs:
```bash
npm run seed
```

### 5. Start the Application
Start the Next.js development server:
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

### 6. Start Background Workers
In a separate terminal, launch the BullMQ workers:
```bash
npm run worker:dev
```
Or build and run the production worker bundle:
```bash
npm run build:worker
npm run worker
```

### 7. Run Automated Tests
```bash
# Full test suite (320+ unit, component, API, and integration tests)


# Focused test run
npx vitest run tests/unit/email-provider.test.ts

# Code quality and type validation
npm run lint
npx tsc --noEmit

# Production application and worker build
npm run build
```

---

## ✉️ Mailtrap API Architecture: Streams & Transport

Fit-PRO uses **Mailtrap's HTTPS API** instead of legacy SMTP to ensure reliable delivery in environments where outbound SMTP ports (25, 465, 587, 2525) are blocked.

### 1. Integration Method: Nodemailer with MailtrapTransport
Fit-PRO integrates the official `mailtrap` package using its native `MailtrapTransport` adapter for `nodemailer`. This provides:
- **Zero SMTP Dependency**: All messages are dispatched via HTTPS REST calls (`https://send.api.mailtrap.io/api/send`).
- **Template Compatibility**: Retains existing Mailgen HTML and plaintext generators without rewrite.
- **Standard Message Schema**: Standard Nodemailer message options (`from`, `to`, `subject`, `html`, `text`) are preserved.

### 2. Stream Separation: Transactional vs. Bulk
Mailtrap enforces strict domain reputation isolation across two streams:
- **Transactional Stream** (`https://send.api.mailtrap.io/api/send`):
  - Used for **all current Fit-PRO emails**: account verification, password resets, and individual smart fitness/wellness notifications.
  - Configured as the system-wide default transport. Account and security emails are guaranteed to never route to Bulk.
- **Bulk Stream** (`https://bulk.api.mailtrap.io/api/send`):
  - Reserved exclusively for marketing campaigns, announcements, and newsletters.
  - **Deliberate Scope Decision**: Fit-PRO currently has no marketing newsletter sending subsystem. The Bulk stream is supported via explicit `stream: "bulk"` configuration, but remains unused for all application workflows to prevent accidental routing of critical user messages to marketing channels.

### 3. Environment Modes
- **Automated Tests & Mock Mode (`EMAIL_PROVIDER=mock`)**:
  - Automatically active during automated testing or when `MAILTRAP_API_TOKEN` is unset in development.
  - Simulates deliveries with deterministic message IDs (`mock-{timestamp}-{random}`).
  - Never executes external HTTP calls or requires real API tokens.
- **Real Mailtrap API Mode (`EMAIL_PROVIDER=mailtrap`)**:
  - For live staging or local smoke testing with verified domain (`fit-pro.publicvm.com`).
  - Requires valid `MAILTRAP_API_TOKEN` and verified `EMAIL_FROM` (e.g. `Fit-PRO <hello@fit-pro.publicvm.com>`).
  - Missing credentials produce actionable configuration errors instead of silent simulation.
  - Sensitive tokens are automatically redacted from error logs.

## 🛡️ Health & Medical Disclaimer

> **IMPORTANT**: AI Fitness and its integrated AI Coach features provide fitness, workout, and nutritional suggestions for informational and educational purposes only. They do not constitute medical advice, medical diagnosis, or treatment. Always consult a qualified physician or healthcare provider before beginning any new diet or exercise regimen.

---

## 📄 License
This project is proprietary and confidential. Created for the AI Fitness Platform.
