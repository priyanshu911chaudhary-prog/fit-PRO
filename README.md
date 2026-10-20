# AI Fitness (fit-PRO) 🏋️‍♂️🤖

A state-of-the-art, full-stack fitness tracking, workout planning, and real-time AI coaching platform. Built with **Next.js 16 (App Router)**, **React 19**, **TypeScript (Strict Mode)**, **Tailwind CSS v4**, **shadcn/ui (Base UI)**, **MongoDB Atlas (Mongoose)**, and the official **Google Gemini AI SDK (`@google/genai`)**.

---

## 🌟 Key Features

### 🔐 Enterprise-Grade Authentication & Security
- **Dual-Token Architecture**: Short-lived Access Token (15m) and long-lived Refresh Token (7d) stored in hardened `httpOnly`, `secure`, `sameSite: "lax"` cookies.
- **Single-Flight Refresh Loop**: Client-side API client deduplicates concurrent 401s into a single refresh request with token rotation grace windows.
- **Server Component Handlers**: Dedicated `/api/auth/refresh` redirect handler ensures expired Server Component navigations refresh credentials without desync.
- **Algorithm Pinning**: JWT signing and verification pinned strictly to `HS256`.
- **Hashed Refresh Storage & Bcrypt**: Refresh tokens are SHA-256 hashed at rest; passwords verified via `bcryptjs` strictly capped at 72 bytes.
- **Secure OAuth**: Google OAuth ID token validation via `google-auth-library` (audience check and `email_verified` enforcement); Microsoft OAuth verification via JWKS (`oid`/`sub` + `tid` identification).
- **Non-Enumerating Auth**: Forgot-password, login, and registration endpoints return uniform timing and messaging, eliminating account enumeration.

### 🛡️ Distributed Mongo TTL Rate Limiting
- Zero in-memory rate limiters (`express-rate-limit` removed).
- Built-in, high-performance distributed rate limiter backed by a dedicated MongoDB TTL collection (`RateLimit`), operating seamlessly across serverless instances and Vercel edge nodes.

### 🤖 AI Coach & Smart Plan Generation
- **Official Google Gemini SDK**: Uses `@google/genai` with model configurable via `GEMINI_MODEL` (defaults to `gemini-2.5-flash`).
- **Real-Time Streaming Coach**: Interactive SSE streaming endpoint (`/api/coach`) providing immediate conversational feedback, formatted markdown, and mandatory health disclaimers.
- **Legacy AI Chat Contract**: Full backward compatibility with the Express `POST /api/ai/chat` endpoint.
- **Structured Plan Generation**: Generates 7-day personalized workout splits and daily meal plans using Gemini structured JSON schemas validated with Zod.
- **Automatic Catalog Upserting**: Normalizes and idempotently upserts AI-recommended exercises and foods into the database catalog.

### 📊 Precision Metrics & Tracking
- **Mifflin-St Jeor Engine**: Live dynamic computation of BMR (Basal Metabolic Rate) and TDEE (Total Daily Energy Expenditure), deriving age dynamically from Date of Birth.
- **BMI Trajectory & Day-1 Recording**: Onboarding automatically logs the initial Day-1 BMI entry; continuous logging provides interactive Recharts trend visualizations.
- **Timezone-Aware Day Logic**: Water intake resets, streak calculations, and date filters respect the client's IANA timezone transmitted via the `X-Timezone` header.
- **Hydration Tracker**: Real-time water tracker with circular progress ring, one-click quick logging (+250ml, +500ml, +750ml, +1L), and immediate undo.
- **Workout & Meal Loggers**: Deep catalog search with muscle group and meal type filters, dynamic set/rep/weight rows, and server-side macro calculations.

---

## 🏗️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack, Partial Prerendering) |
| **Frontend** | [React 19](https://react.dev/), [TypeScript Strict Mode](https://www.typescriptlang.org/) |
| **Styling & UI** | [Tailwind CSS v4](https://tailwindcss.com/), [Base UI](https://base-ui.com/), [shadcn/ui](https://ui.shadcn.com/), [Lucide React](https://lucide.dev/) |
| **Data Visualization**| [Recharts 3](https://recharts.org/) |
| **Database & ODM** | [MongoDB Atlas](https://www.mongodb.com/atlas), [Mongoose 9](https://mongoosejs.com/) (Cached global singleton) |
| **Validation** | [Zod 4](https://zod.dev/) (Shared across API route handlers and React Hook Form) |
| **Artificial Intelligence** | [Google Gen AI SDK (`@google/genai`)](https://www.npmjs.com/package/@google/genai) |
| **State & Data Fetching** | [TanStack React Query v5](https://tanstack.com/query/latest) |
| **Testing** | [Vitest](https://vitest.dev/) |

---

## 📁 Project Structure

```
fit-PRO/
├── scripts/
│   ├── seed-exercises.ts       # Idempotent exercise catalog seeder (tsx)
│   └── seed-meals.ts           # Idempotent food catalog seeder (tsx)
├── src/
│   ├── app/                    # Next.js App Router (Pages & Route Handlers)
│   │   ├── (auth)/             # Auth pages: /login, /register, /forgot-password, /verify-email
│   │   ├── api/                # Unified Route Handlers (JSON REST & SSE Streaming)
│   │   │   ├── ai/chat/        # Legacy JSON AI chat endpoint
│   │   │   ├── auth/           # Login, register, refresh, me, oauth, passwords
│   │   │   ├── bmi/            # BMI logging and historical trend
│   │   │   ├── coach/          # Real-time SSE streaming AI coach
│   │   │   ├── dashboard/      # Timezone-aware stats and streak calculation
│   │   │   ├── exercises/      # Catalog search with muscle/equipment filters
│   │   │   ├── foods/          # Catalog search with dietary/type filters
│   │   │   ├── meal/           # Meal logging, history, and AI generation
│   │   │   ├── profile/        # Profile onboarding, viewing, and patching
│   │   │   ├── water/          # Water logging, today query, and deletion
│   │   │   └── workout/        # Workout logging, history, and AI generation
│   │   ├── bmi/                # BMI log & trajectory chart page
│   │   ├── coach/              # Real-time AI coach chat interface
│   │   ├── dashboard/          # Central fitness dashboard & metrics
│   │   ├── meal/               # Meal logging interface & history
│   │   ├── onboarding/         # Multi-step profile setup wizard
│   │   ├── plans/              # Saved AI workout & meal plans
│   │   ├── profile/            # User profile view and update settings
│   │   ├── water/              # Interactive water tracker
│   │   ├── workout/            # Workout logger with exercise catalog picker
│   │   ├── layout.tsx          # Root layout with providers, navbar, and footer
│   │   └── page.tsx            # High-conversion landing page
│   ├── components/             # Reusable UI & Layout components
│   │   ├── navbar.tsx          # Responsive navigation bar with auth state
│   │   ├── footer.tsx          # Application footer with health disclaimer
│   │   ├── theme-toggle.tsx    # Dark / Light mode toggle
│   │   ├── providers.tsx       # QueryClient, ThemeProvider, AuthProvider, Sonner
│   │   └── ui/                 # Accessible primitives (button, card, input, dialog)
│   ├── constants/              # Global enums, boundaries, and system constants
│   ├── context/                # Client Auth Context & Session state
│   ├── lib/                    # Core backend and frontend utilities
│   │   ├── api/                # withHandler, withAuth, withValidation, rate-limit
│   │   ├── ai/                 # Gemini SDK client, schemas, prompts, stream parser
│   │   ├── api-client.ts       # Single-flight refresh, auto X-Timezone HTTP client
│   │   ├── db.ts               # Global Mongoose cached connection
│   │   ├── env.ts              # Zod environment variable validation
│   │   ├── fitness-calc.ts     # BMR, TDEE, BMI, and Age derivation calculations
│   │   └── token.ts            # HS256 JWT sign/verify, cookies, crypto hashes
│   ├── models/                 # 10 Strict Mongoose models with compound indexes
│   └── validators/             # Shared Zod validation schemas
├── tests/                      # Vitest unit test suite (calculations, tokens, envelope)
├── MIGRATION_AUDIT.md          # Comprehensive audit of legacy Express codebase
├── MIGRATION_REPORT.md         # Full architectural migration report and deviations log
├── next.config.ts              # Next.js production configuration
└── package.json                # Project dependencies and operational scripts
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: `v20.x` or higher
- **MongoDB**: MongoDB Atlas URI or local MongoDB instance (`>= 6.0`)
- **Google Gemini API Key**: Obtainable from [Google AI Studio](https://aistudio.google.com/)

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Populate the required environment variables:
```env
# Application
NODE_ENV=development
APP_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/fit-pro?retryWrites=true&w=majority

# JWT Authentication (HS256 - Secrets must be at least 32 characters)
ACCESS_TOKEN_SECRET=your_access_token_secret_min_32_characters_long_for_security
ACCESS_TOKEN_EXPIRATION=15m
REFRESH_TOKEN_SECRET=your_refresh_token_secret_min_32_characters_long_for_security
REFRESH_TOKEN_EXPIRATION=7d

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# OAuth (Optional / Feature Flagged)
GOOGLE_CLIENT_ID=your_google_client_id
MICROSOFT_CLIENT_ID=your_microsoft_client_id

# SMTP Email (Mailtrap for development or standard SMTP)
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_mailtrap_user
SMTP_PASS=your_mailtrap_pass
EMAIL_FROM="AI Fitness <noreply@ai-fitness.com>"
```

### 3. Installation
Install all dependencies:
```bash
npm install
```

### 4. Database Seeding
Populate the exercise and food catalogs with idempotent seed data:
```bash
# Seed both catalogs
npm run seed

# Or run individually:
npm run seed:exercises
npm run seed:meals
```

### 5. Running the Development Server
Start the Next.js Turbopack development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification

Run the automated test suite and code quality gates:

```bash
# Run Vitest unit tests (Calculations, Tokens, Envelope)
npm test

# Run ESLint validation
npm run lint

# Run TypeScript strict type-checking
npx tsc --noEmit

# Build production bundle (Validates 45 static and dynamic routes)
npm run build
```

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

## 🧪 Enterprise Testing Suite (Showcase)

This application includes a production-grade testing suite designed to showcase testing maturity and software craftsmanship across all levels of the testing pyramid.

| Layer | Runner & Tools | Test Target | Key Highlights |
| :--- | :--- | :--- | :--- |
| **Unit** | Vitest 5 | `tests/unit/` | Zod schema validation boundaries, bcrypt 72-byte caps, Mifflin-St Jeor BMR math, JWT HS256 tokens |
| **Component** | Testing Library + Happy-DOM | `tests/components/` | Form submissions, loading spinners, password visibility toggles, reactive metric cards |
| **API & Contract** | Vitest 5 | `tests/api/` | Standardized `{ statusCode, success, message, data }` envelopes (200–500), atomic Mongo TTL rate limiting |
| **DB Integration** | Vitest + Isolated Atlas DB | `tests/integration/` | Real MongoDB persistence, relational cascading, Day-1 initial BMI records, isolated teardown |
| **E2E Journeys** | Playwright 1.64 | `tests/e2e/` | 4 critical user flows: Auth lifecycle, Biometrics & BMI, Daily hydration tracking, Gemini AI Coach |

### Test Commands
```bash
# Run all Unit, Component, API, and Integration suites (100% pass)
npm test

# Run Playwright End-to-End browser journeys
npm run test:e2e

# Run with interactive UI
npm run test:watch
```

For full architecture details, coverage tables, and design decisions, see the dedicated [tests/README.md](tests/README.md).

---

## 🛡️ Health & Medical Disclaimer

> **IMPORTANT**: AI Fitness and its integrated AI Coach features provide fitness, workout, and nutritional suggestions for informational and educational purposes only. They do not constitute medical advice, medical diagnosis, or treatment. Always consult a qualified physician or healthcare provider before beginning any new diet or exercise regimen.

---

## 📄 License
This project is proprietary and confidential. Created for the AI Fitness Platform.
