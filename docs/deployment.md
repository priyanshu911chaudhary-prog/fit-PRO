# Fit-PRO Production Deployment Runbook

This guide describes the production deployment architecture, prerequisites, container configurations, and operational checklist for the Fit-PRO platform.

---

## 1. Supported Architecture & Runtime Versions

- **Node.js**: `v22.x` or `v24.x` (Target container base image: `node:24-bookworm-slim`).
- **Web Application Process**: Next.js 16 standalone Node server (`server.js`) listening on `PORT=3000`.
- **Background Worker Process**: BullMQ worker bundled as a single CommonJS module (`dist/worker.cjs`) via `scripts/build-worker.ts`.
- **Database**: MongoDB 7.0+ (Replica set required for change streams / multi-document transactions, e.g. MongoDB Atlas M0+).
- **In-Memory Cache & Queues**: Redis 7.0+ (Standalone or managed Redis with append-only file persistence enabled).
- **Reverse Proxy**: Nginx or cloud load balancer terminating TLS/HTTPS and routing traffic to the Next.js process on port 3000.

---

## 2. External Services & Production Prerequisites

Before deploying to production, the following external infrastructure must be provisioned:

1. **MongoDB Atlas (or Self-Hosted Replica Set)**:
   - Primary database URI configured in `MONGODB_URI`.
   - Ensure network access/IP whitelisting allows connections from your production hosts/containers.
2. **Redis Service**:
   - URL configured in `REDIS_URL`.
   - Used by BullMQ for background queues (email, notification, leaderboard) and for atomic rate limiting.
3. **Google Gemini AI API Key**:
   - Valid API key from [Google AI Studio](https://aistudio.google.com/) configured in `GEMINI_API_KEY`.
   - Model name configured in `GEMINI_MODEL` (e.g. `gemini-3.5-flash`).
4. **Email Delivery (Mailtrap HTTPS API)**:
   - Mailtrap transactional stream API token configured in `MAILTRAP_API_TOKEN`.
   - Domain must have verified SPF, DKIM, and DMARC DNS records.
   - Verified sender email set in `EMAIL_FROM` (e.g., `Fit-PRO <hello@fit-pro.live>`).
5. **Web Push VAPID Keypair**:
   - Generated via `npx web-push generate-vapid-keys`.
   - Public key set in `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
   - Private key set in `VAPID_PRIVATE_KEY`.
   - Contact email set in `VAPID_SUBJECT` (e.g., `mailto:support@fit-pro.live`).
6. **OAuth 2.0 Credentials (Optional)**:
   - **Google**: Configure authorized redirect URI (`https://<domain>/api/auth/google/callback`) in Google Cloud Console. Set `GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`.
   - **Microsoft**: Configure authorized redirect URI (`https://<domain>/api/auth/microsoft/callback`) in Azure Entra ID. Set `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET`.
7. **Secrets**:
   - `ACCESS_TOKEN_SECRET`: Minimum 32-character high-entropy secret.
   - `REFRESH_TOKEN_SECRET`: Minimum 32-character high-entropy secret.
   - `EMAIL_PAYLOAD_SECRET`: Minimum 32-character secret for encrypting outbox records at rest.
   - `ADMIN_API_KEY`: Optional 32-character secret for monitoring `/api/admin/queues`.

---

## 3. Production Build & Packaging

The application build compiles both the Next.js standalone web server and the standalone worker bundle:

```bash
# 1. Clean reproducible dependency install
npm ci

# 2. Build Next.js standalone application and worker bundle
npm run build
```

This generates:
- `.next/standalone/`: Next.js minimal self-contained production server (`server.js`).
- `.next/static/`: Static client assets (must be copied to `.next/standalone/.next/static`).
- `public/`: Public static assets (must be copied to `.next/standalone/public`).
- `dist/worker.cjs`: Bundled BullMQ background processor.

---

## 4. Deployment via Docker & Compose

The repository includes a production-grade multi-stage `Dockerfile` and `compose.yaml`:

### 4.1 Multi-Stage Dockerfile Highlights
- **Build Stage**: Runs in `node:24-bookworm-slim`, compiles standalone web application and `dist/worker.cjs` using an in-memory esbuild mock plugin for `server-only`.
- **Runtime Stage**: Copies only `.next/standalone`, static assets, and `dist/worker.cjs`.
- **Security**: Runs under a dedicated unprivileged user (`USER nextjs:nodejs`, UID/GID 1001).
- **Signals**: Next.js and Node handle `SIGTERM` and `SIGINT` gracefully for zero-downtime rolling deploys.

### 4.2 Building and Running with Docker Compose
```bash
# 1. Validate configuration
docker compose config

# 2. Build container image
docker compose build

# 3. Start services in background (Nginx, App1, App2, Worker, Redis)
docker compose up -d

# 4. Check service status
docker compose ps

# 5. Tail logs
docker compose logs -f app1 worker
```

### 4.3 Running Standalone on Host / VM
If deploying directly to virtual machines or systemd without Docker:

```bash
# Terminal 1: Run Next.js Application Server
NODE_ENV=production PORT=3000 node .next/standalone/server.js

# Terminal 2: Run BullMQ Background Worker
NODE_ENV=production node dist/worker.cjs
```

---

## 5. Catalog Seeding & Database Initialization

On initial database setup, seed the food and exercise movement catalogs:

```bash
# Seed 300+ standard exercise movements (idempotent upsert)
npm run seed:exercises

# Seed 360+ standard nutritional food items (idempotent upsert)
npm run seed:meals

# Or run both seeders in sequence
npm run seed
```

*Note*: Seed scripts are strictly idempotent and use `findOneAndUpdate` with `upsert: true`. They can be safely re-run without duplicating records or resetting user data.

---

## 6. Pre-Flight Deployment Checklist

Before routing live traffic to the deployment:

- [ ] `npm run lint`: Clean (0 errors, 0 warnings).
- [ ] `npx tsc --noEmit`: Clean (0 diagnostic errors).
- [ ] `npm test`: 323 / 323 unit and integration tests passing.
- [ ] `npm run test:quality`: 68 / 68 quality and regression tests passing.
- [ ] `npm run test:quality:e2e`: 25 / 25 Playwright journey tests passing.
- [ ] `npm run build`: Successfully generated standalone build and `dist/worker.cjs`.
- [ ] `docker compose config`: Exits with code 0.
- [ ] `.env` file verified excluded from Git (`git status --ignored`).
- [ ] `NODE_ENV` is set to `production`.
- [ ] `EMAIL_PROVIDER` is set to `mailtrap` with valid `MAILTRAP_API_TOKEN` and verified `EMAIL_FROM` domain.
- [ ] `GEMINI_API_KEY` is configured and live generation verified.
- [ ] `MONGODB_URI` points to durable production replica set.
- [ ] `REDIS_URL` points to production Redis instance.
- [ ] Both web app (`server.js`) and background worker (`dist/worker.cjs`) are running and healthy.
- [ ] Health check endpoint `/api/admin/queues` returns status `200` with `redis.isReady: true`.

