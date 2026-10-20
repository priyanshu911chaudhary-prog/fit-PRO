# 🧪 Enterprise Testing Suite & Quality Engineering Showcase

> **Project:** `fit-PRO` — Full-Stack AI Fitness & Biometrics Platform  
> **Testing Stack:** Vitest 5 • React Testing Library • Happy-DOM • Playwright 1.64 • Mongoose 9 (Isolated Atlas Test DB) • Jose (HS256)

---

## 🏛️ Testing Pyramid Architecture

This test suite was engineered to demonstrate modern full-stack testing craftsmanship. Rather than relying on superficial unit tests or mock-heavy assertions, the system enforces real boundary validation, component interaction simulations, cryptographic security checks, and real database persistence.

```text
               /\
              /  \     E2E User Journeys (Playwright)
             /    \    - 4 Core User Journeys (Auth, Onboarding, Daily Logging, AI Coach)
            /------\
           /        \    Integration Tests (Vitest + MongoDB Atlas)
          /          \   - Multi-collection persistence, relational cascading, biometrics
         /------------\
        /              \   API & Contract Tests (Vitest)
       /                \  - Status code envelopes, error pipelines, atomic rate limits
      /------------------\
     /                    \  Component Tests (React Testing Library + Happy-DOM)
    /                      \ - Form validations, password toggles, reactive metric cards
   /------------------------\
  /                          \ Unit Tests (Vitest)
 /                            \ - Zod schema guards, Mifflin-St Jeor BMR math, JWT HS256 tokens
/------------------------------\
```

---

## 📁 Directory Structure & Responsibilities

```text
tests/
├── setup.ts                    # Global test bootstrap (dotenv, secret fallbacks, testing-library setup)
├── unit/
│   ├── validators.test.ts      # Zod validation rules (Auth, Meal, Workout, Water, BMI boundaries)
│   ├── fitness-calc.test.ts    # Biometric engine (Mifflin-St Jeor, TDEE activity multipliers, leap years)
│   └── security-tokens.test.ts # Cryptographic token lifecycle (HS256 sign/verify, key separation, cookie flags)
├── components/
│   ├── login-form.test.tsx     # Client-side validation, submit dispatch, loading spinners, visibility toggles
│   └── metric-card.test.tsx    # Reactive UI states: percentage progress, quick-action callbacks, loading skeletons
├── api/
│   ├── status-codes-and-errors.test.ts # Envelopes: 200, 201, 400 (validation), 401, 403, 404, 429, 500
│   └── rate-limit.test.ts              # Atomic Mongo TTL rate limiter & anti-spoofing IP rotation defenses
├── integration/
│   └── db-persistence.test.ts  # Real MongoDB persistence, Day-1 initial BMI records, cascading deletions
├── e2e/
│   ├── playwright.config.ts    # Playwright configuration with automatic dev server boot (reuseExistingServer)
│   ├── e2e-helpers.ts          # Session injection, isolated test user provisioning, teardown handlers
│   └── journeys/
│       ├── 01-auth-lifecycle.spec.ts     # Register -> Email Verification -> Login -> HttpOnly Session
│       ├── 02-onboarding-profile.spec.ts # Profile Setup -> Height/Weight -> Day-1 BMI calculation
│       ├── 03-daily-logging.spec.ts      # Hydration quick-log (+250ml) -> Metric updates
│       └── 04-ai-coach-and-plan.spec.ts  # Gemini AI coach streaming interface & prompt suggestions
└── README.md                   # This documentation
```

---

## 📊 Test Scenarios & Coverage Matrix

| Category | Suite | Test Cases | Key Validations |
| :--- | :--- | :---: | :--- |
| **Unit** | `validators.test.ts` | 12 | Zod schemas, 72-char bcrypt limit, 24-hex Mongo ObjectIDs, non-negative biometrics |
| **Unit** | `fitness-calc.test.ts` | 14 | Mifflin-St Jeor (+5 male / -161 female), TDEE multipliers (1.2x - 1.725x), BMI boundaries |
| **Unit** | `security-tokens.test.ts` | 6 | HS256 signature verification, tampered token rejection, cross-secret protection, HttpOnly cookies |
| **Component** | `login-form.test.tsx` | 6 | Empty field validation, async submit triggers, password toggle, disabled loading state |
| **Component** | `metric-card.test.tsx` | 3 | Reactive progress bar calculations, quick-add action callbacks, skeleton loaders |
| **API** | `status-codes-and-errors.test.ts` | 8 | Standardized `{ statusCode, success, message, data }` envelopes across 200–500 |
| **API** | `rate-limit.test.ts` | 4 | Atomic Mongo TTL counter, 429 quota exhaustion, client IP rotation protection |
| **Integration**| `db-persistence.test.ts` | 5 | User & Profile persistence, Day-1 BMI history generation, atomic increment, isolated teardown |
| **E2E** | `01-04 journeys` | 4 | Complete browser user flows for Auth, Biometrics, Water Logging, and Gemini AI Coach |

---

## 🚀 Execution Commands

### 1. Run All Vitest Suites (Unit, Component, API, Integration)
```bash
npm test
```

### 2. Run Isolated Suite by Category
```bash
# Unit tests only
npx vitest run tests/unit

# Component tests only (runs in Happy-DOM)
npx vitest run tests/components

# API & Contract tests only
npx vitest run tests/api

# Database integration tests only (runs against isolated test database)
npx vitest run tests/integration
```

### 3. Run Playwright End-to-End Journeys
```bash
# Run all E2E journeys
npm run test:e2e

# Run with interactive UI mode
npx playwright test -c tests/e2e/playwright.config.ts --ui
```

---

## 🛡️ Engineering Decisions & Best Practices

1. **Dual Execution Environments:**
   - Vitest backend tests execute in high-performance `node` environment.
   - Component tests explicitly declare `// @vitest-environment happy-dom` to simulate full DOM APIs with minimal overhead.
2. **Database Isolation Strategy:**
   - Integration tests connect to an isolated MongoDB database (`fit-PRO-test`).
   - Every test run uses unique timestamps for entity identifiers and runs automatic cascading teardown hooks in `afterAll` or `afterEach`.
3. **Zero Bluff Policy:**
   - No mock tautologies (`expect(true).toBe(true)`).
   - Component tests simulate real browser events via `@testing-library/react`.
   - Cryptographic tests compute real SHA-256 and HMAC HS256 signatures using `jose`.
