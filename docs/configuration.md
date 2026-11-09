# Fit-PRO Configuration Guide

This document details the configuration parameters, environment variables, security boundaries, and operational settings for the Fit-PRO platform.

---

## 1. Environment Variable Reference

All runtime environment variables are validated at server startup by `src/lib/env.ts` using Zod.

| Variable | Required in Production | Default (Dev / Test) | Consumer(s) | Description |
|---|:---:|---|---|---|
| `NODE_ENV` | **Yes** | `development` | Core runtime, next.js, providers | Controls optimization, cookie security (`secure: true`), and failsafe AI provider guards. Allowed values: `development`, `test`, `production`. |
| `APP_URL` | **Yes** | `http://localhost:3000` | Redirects, cookies, emails | Base canonical URL for OAuth callbacks, email links, and redirect validation. |
| `MONGODB_URI` | **Yes** | — | `src/lib/db.ts`, Mongoose models | MongoDB connection string (Atlas M0+ or self-hosted). In development, falls back to `mongodb://127.0.0.1:27017/fit-pro` if unset. |
| `MONGODB_URI_TEST` | **No** (Req in Tests) | — | `quality-tests/helpers/db-guard.ts` | Dedicated test database URI. Refuses to run tests if missing or if the database name does not contain `test`. |
| `REDIS_URL` | **Yes** (Recommended) | `redis://127.0.0.1:6379` | `src/lib/redis/client.ts`, `src/lib/queues/connection.ts` | Redis connection URL for distributed rate limiting, cache-aside, and BullMQ job queues. If unreachable, caching and rate limiting fail open safely. |
| `ACCESS_TOKEN_SECRET` | **Yes** | — (min 16 chars, 32+ recommended) | `src/lib/auth/jwt.ts` | Cryptographic secret for signing stateless HS256 access JWTs. |
| `ACCESS_TOKEN_EXPIRATION` | No | `15m` | `src/lib/auth/jwt.ts` | Lifetime for access tokens (e.g. `15m`, `1h`). |
| `REFRESH_TOKEN_SECRET` | **Yes** | — (min 16 chars, 32+ recommended) | `src/lib/auth/jwt.ts` | Cryptographic secret for signing HS256 refresh JWTs. |
| `REFRESH_TOKEN_EXPIRATION` | No | `7d` | `src/lib/auth/jwt.ts` | Lifetime for refresh tokens (e.g. `7d`, `30d`). |
| `GEMINI_API_KEY` | **Yes** (Prod AI) | `""` | `src/lib/ai/gemini.ts` | Google Gemini API Key from Google AI Studio. Optional in tests when using mock provider. |
| `GEMINI_MODEL` | No | `gemini-3.5-flash` | `src/lib/ai/gemini.ts` | Gemini model identifier (e.g., `gemini-3.5-flash` or `gemini-2.5-flash`). |
| `GOOGLE_CLIENT_ID` | Optional | — | `src/app/api/auth/google/route.ts` | OAuth 2.0 Client ID for Google Single Sign-On. |
| `GOOGLE_CLIENT_SECRET` | Optional | — | `src/app/api/auth/google/callback/route.ts` | OAuth 2.0 Client Secret for Google Single Sign-On. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Optional | — | Frontend Google One Tap login | Client-side Google OAuth client identifier. |
| `MICROSOFT_CLIENT_ID` | Optional | — | `src/app/api/auth/microsoft/route.ts` | Application (Client) ID for Microsoft Entra ID SSO. |
| `MICROSOFT_CLIENT_SECRET` | Optional | — | `src/app/api/auth/microsoft/callback/route.ts` | Client secret for Microsoft Entra ID SSO. |
| `EMAIL_PROVIDER` | **Yes** | `mock` | `src/lib/email/index.ts` | Email transport. In dev/test: defaults to `mock`. In production: `mailtrap` is required. |
| `MAILTRAP_API_TOKEN` | Required if `EMAIL_PROVIDER=mailtrap` | — | `src/lib/email/mailtrap.ts` | Mailtrap HTTPS API Token (Transactional stream). |
| `EMAIL_FROM` | No | `Fit-PRO <hello@fit-pro.publicvm.com>` | `src/lib/email/mailtrap.ts` | Verified sender address for outbound transactional emails. |
| `EMAIL_PAYLOAD_SECRET` | No | Defaults to `ACCESS_TOKEN_SECRET` | `src/lib/email/crypto.ts` | 32-character secret for encrypting outbox tokens/links at rest in MongoDB. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | **Yes** (Prod Push) | Development fallback key | Browser PushManager | VAPID Public Key for browser web push subscriptions. |
| `VAPID_PRIVATE_KEY` | **Yes** (Prod Push) | Development fallback key | `src/workers/processors/notification.processor.ts` | VAPID Private Key for web push notification delivery. |
| `VAPID_SUBJECT` | No | `mailto:support@fitpro.local` | `src/workers/processors/notification.processor.ts` | VAPID contact URI (email or HTTPS URL). |
| `ADMIN_API_KEY` | Optional | — | `src/app/api/admin/queues/route.ts` | Shared machine-to-machine header key (`x-admin-key`) for queue monitoring without user session. |

---

## 2. Safe Local Environment Setup

1. Copy the example configuration template:
   ```bash
   cp .env.example .env
   ```
2. For local development, `.env.example` provides safe defaults for secrets, tokens, and fallback keys.
3. Configure your local or development MongoDB database:
   ```bash
   MONGODB_URI=mongodb://127.0.0.1:27017/fit-pro
   MONGODB_URI_TEST=mongodb://127.0.0.1:27017/fit-pro-test
   ```
4. Verify that `.env` is ignored by Git:
   ```bash
   git status --ignored
   # Should list .env as ignored (!!)
   ```

---

## 3. Database Safety & Isolation

Fit-PRO uses two distinct MongoDB databases to ensure complete test safety:
- **Application / Development DB (`MONGODB_URI`)**: Holds application accounts, user workout logs, and catalog data.
- **Isolated Quality Test DB (`MONGODB_URI_TEST`)**: Used exclusively by Vitest suites (`quality-tests/`) and Playwright E2E tests (`quality-tests/e2e`).
- **Database Safety Guard**: `quality-tests/helpers/db-guard.ts` executes before any quality test or E2E session runs. It checks:
  1. `MONGODB_URI_TEST` is explicitly defined.
  2. The target database name contains `test`.
  3. The target database name does **not** match production patterns (e.g. `prod`).
  If any check fails, execution aborts immediately with a `SAFETY ABORT` error.

---

## 4. AI Provider Configuration & Security Seam

### Production Mode (`NODE_ENV=production`)
- Only the official Google Gemini SDK provider (`GoogleGenAIPlanProvider`) is permitted.
- `src/lib/ai/gemini.ts` contains a fail-closed production guard:
  - Any call to `setAIPlanProvider(...)` throws an immediate `Error: Security violation`.
  - The `AI_PROVIDER_MOCK` flag is strictly ignored.
  - Client request parameters, headers, or query strings have zero control over provider selection.

### Development and Testing Mode (`NODE_ENV=test` or `AI_PROVIDER_MOCK=true`)
- When running automated test suites or local testing without an active Gemini API key, set:
  ```bash
  AI_PROVIDER_MOCK=true
  ```
- The application will utilize `DeterministicMockPlanProvider`, returning structurally valid 7-day workout and meal plans that pass all Zod validation schemas and catalog reconciliation without making outbound external network calls.

---

## 5. Email Delivery & Outbox Architecture

1. **Transactional Outbox Pattern**:
   - Authentication routes (`/api/auth/register`, `/api/auth/forgot-password`) do not send emails synchronously.
   - They insert an encrypted outbox record into MongoDB (`EmailOutbox` collection) with `EMAIL_PAYLOAD_SECRET` AES-256-GCM encryption.
   - A background BullMQ worker job is enqueued to process the outbox item asynchronously.
2. **Provider Selection**:
   - `EMAIL_PROVIDER=mock`: Outbox jobs are marked as processed in MongoDB without calling external APIs. Used for automated tests and offline development.
   - `EMAIL_PROVIDER=mailtrap`: Outbox worker delivers the email via the Mailtrap HTTPS API (`mailtrap` SDK). Requires `MAILTRAP_API_TOKEN` and a verified `EMAIL_FROM` domain.

---

## 6. Common Troubleshooting

| Symptom | Probable Cause | Resolution |
|---|---|---|
| `Environment validation failed: MONGODB_URI is required` | Missing `.env` file or variable not exported. | Verify `.env` exists in root and contains `MONGODB_URI`. |
| `Environment validation failed: MAILTRAP_API_TOKEN is required` | `NODE_ENV=production` with `EMAIL_PROVIDER=mailtrap` but no token. | Provide a valid Mailtrap API token in `.env`. |
| `SAFETY ABORT: MONGODB_URI_TEST database does not contain "test"` | Test runner pointed at primary or production database. | Set `MONGODB_URI_TEST=mongodb://127.0.0.1:27017/fit-pro-test`. |
| Redis connection warning in logs | Redis daemon not running or incorrect `REDIS_URL`. | Check `docker ps` for redis container or local redis-server. System automatically falls back to MongoDB for caching and rate limiting. |
| BullMQ worker does not process jobs | Worker process not started or Redis unavailable. | Run `npm run worker` in a dedicated process alongside `npm run dev`. |
| Playwright E2E port conflict | Existing process listening on port 3000. | Stop the local `next dev` process before running `npm run test:quality:e2e`. |

