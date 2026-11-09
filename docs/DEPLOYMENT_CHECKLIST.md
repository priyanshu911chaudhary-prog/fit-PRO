# Production Deployment Checklist — AI Fitness (`fit-PRO`)

This checklist is the definitive, step-by-step production runbook for deploying the `fit-PRO` Next.js full-stack application to **Vercel** and **MongoDB Atlas**.

---

## 1. Environment Variables Configuration (Vercel Project Settings)

Add the following environment variables to your project in the Vercel Dashboard under **Settings → Environment Variables**. Configure them for **Production** (and optionally **Preview** environments).

> [!CAUTION]
> **Zero Secrets Policy**: Never commit actual secret values to git or print them in build logs. Only enter them directly into the secure Vercel environment variable vault.

| Variable Name | Required | Description / Example Format |
|---|:---:|---|
| `NODE_ENV` | Yes | Set to `production` |
| `APP_URL` | Yes | Canonical production origin (e.g. `https://fitness.yourdomain.com`). Used for email verification links, password reset links, and CORS origin validation. |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string with replica set (e.g. `mongodb+srv://<user>:<password>@cluster0.abcde.mongodb.net/fit-PRO?retryWrites=true&w=majority&appName=Cluster0`). |
| `JWT_SECRET` | Yes | Cryptographically secure random secret (min 32 chars) for signing session and auth tokens. |
| `JWT_REFRESH_SECRET` | Yes | Cryptographically secure random secret (min 32 chars) for refresh tokens. |
| `GEMINI_API_KEY` | Yes | Google AI Studio Gemini API key for AI fitness coach and plan generation. |
| `GEMINI_MODEL` | Yes | Default model string: `gemini-3.5-flash` (with automated fallback to `gemini-3.1-flash-lite`). |
| `SMTP_HOST` | Yes | Production SMTP host (e.g. `smtp.resend.com`, `smtp-relay.brevo.com`, or `email-smtp.us-east-1.amazonaws.com`). |
| `SMTP_PORT` | Yes | SMTP port (e.g. `465` for SSL/TLS, `587` for STARTTLS). |
| `SMTP_SECURE` | Yes | `true` for port 465; `false` for port 587. |
| `SMTP_USER` | Yes | SMTP username or API key user (e.g. `resend` for Resend, account email for Brevo, or IAM SMTP user for SES). |
| `SMTP_PASS` | Yes | SMTP password or provider API key secret. |
| `EMAIL_FROM` | Yes | Verified sender email address (e.g. `AI Fitness <noreply@yourdomain.com>`). Must match your domain SPF/DKIM records. |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth 2.0 Web Client ID from Google Cloud Console. |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth 2.0 Client Secret. |
| `AZURE_AD_CLIENT_ID` | Optional | Microsoft Azure App Registration Client ID (if Microsoft sign-in enabled). |
| `AZURE_AD_CLIENT_SECRET` | Optional | Microsoft Azure App Registration Client Secret. |

---

## 2. Canonical Application URL (`APP_URL`)

- Ensure `APP_URL` does **not** include a trailing slash (e.g. `https://fitness.yourdomain.com`).
- Next.js server components and Route Handlers use `APP_URL` to generate email verification links, password reset links, and metadata canonical tags.
- For Vercel Preview deployments, if dynamic preview URLs are needed, set `APP_URL` dynamically or configure your custom preview domain.

---

## 3. MongoDB Atlas Network Access

Because Vercel serverless functions execute within dynamic AWS Lambda IP ranges, you must configure network ingress on MongoDB Atlas:

1. Open **MongoDB Atlas Dashboard → Network Access**.
2. Click **Add IP Address**.
3. Select **Allow Access From Anywhere** (`0.0.0.0/0`) with a clear comment (e.g. `Vercel Serverless Functions`).
   > *Enterprise Alternative*: For AWS-dedicated Atlas clusters, set up AWS VPC Peering or AWS PrivateLink between your Vercel AWS account VPC and MongoDB Atlas VPC.
4. Verify Database User Privileges:
   - Ensure the user credentials in `MONGODB_URI` have `readWrite` access to the target production database (e.g. `fit-PRO`).

---

## 4. Google OAuth Production Configuration

If Google Sign-In is enabled:
1. Open **Google Cloud Console → APIs & Services → Credentials**.
2. Select your OAuth 2.0 Web Application client.
3. Under **Authorized JavaScript Origins**, add:
   - `https://fitness.yourdomain.com` (your exact production domain)
4. Under **Authorized Redirect URIs**, add:
   - `https://fitness.yourdomain.com/api/auth/oauth/google`
5. Save changes. Note that Google OAuth credentials may take up to 5 minutes to propagate globally.

---

## 5. Seed Production Catalog Data

Before opening user registration, initialize the exercise and food item catalogs in MongoDB:

```bash
# Seed Exercise Catalog (14 core multi-muscle exercises)
npm run seed:exercises

# Seed Nutrition / Food Catalog (10 macronutrient-calibrated items)
npm run seed:foods

# Or run the unified seed runner:
npm run seed
```

Verify in Atlas collections:
- `exercises`: At least 14 documents populated with valid `targetMuscle`, `equipment`, and `category`.
- `fooditems`: At least 10 documents populated with calories, protein, carbs, and fat metrics.

---

## 6. Production SMTP Provider Setup (SPF, DKIM, DMARC)

Configure your transactional email provider (Resend, Brevo, or Amazon SES) using standard SMTP variables:

### Option A: Resend (Recommended)
- **SMTP Host**: `smtp.resend.com`
- **SMTP Port**: `465` (SSL) or `587` (TLS)
- **SMTP User**: `resend`
- **SMTP Pass**: `re_xxxxxxxxxxxxxxxxxxxx`
- **From Address**: `AI Fitness <noreply@yourdomain.com>`

### Option B: Brevo (formerly Sendinblue)
- **SMTP Host**: `smtp-relay.brevo.com`
- **SMTP Port**: `587`
- **SMTP User**: `your-brevo-login-email@domain.com`
- **SMTP Pass**: Your Brevo SMTP key

### Option C: Amazon SES
- **SMTP Host**: `email-smtp.<region>.amazonaws.com`
- **SMTP Port**: `465` or `587`
- **SMTP User**: Your AWS SES SMTP Access Key ID
- **SMTP Pass**: Your AWS SES SMTP Secret Key

### Required DNS Verification Records:
1. **SPF Record (TXT)**:
   - Name: `@` (or subdomain)
   - Value: `v=spf1 include:resend.com ~all` (replace `resend.com` with provider's SPF include string)
2. **DKIM Record (CNAME / TXT)**:
   - Add the DKIM selector records provided by your email service (e.g. `resend._domainkey.yourdomain.com`).
3. **DMARC Record (TXT)**:
   - Name: `_dmarc.yourdomain.com`
   - Value: `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@yourdomain.com; pct=100; adkim=r; aspf=r`

---

## 7. Post-Deployment Production Smoke Test

Execute this verification sequence immediately following production deployment:

- [ ] **Health Check**:
  - Visit `https://fitness.yourdomain.com/` — Verify landing page loads with modern UI and no console errors.
- [ ] **SSL / Cookie Security**:
  - Inspect cookies in DevTools Network tab — Confirm `accessToken` and `refreshToken` are set with `HttpOnly`, `Secure`, `SameSite=Lax`, and scoped `Path=/`.
- [ ] **Registration & Real Email Delivery**:
  - Register a new test account with an external inbox.
  - Verify transactional email arrives with correct branding and sender address.
  - Click verification link — Confirm redirect to `/login` with success banner.
- [ ] **Onboarding & Baseline Submission**:
  - Sign in, complete the 4-step wizard, and submit profile metrics.
  - Confirm redirect to `/dashboard`.
- [ ] **Activity & Biomarker Tracking**:
  - Log BMI weight update on `/bmi`.
  - Log hydration (+250ml) and test Undo button on `/water`.
  - Log a workout session on `/workout`.
  - Log a meal entry on `/meal`.
- [ ] **Gemini AI Plan Generation**:
  - Navigate to `/plans` → click "Generate New Workout Split" → Confirm 3-day split formulation within 15 seconds.
- [ ] **Gemini AI Streaming Coach**:
  - Navigate to `/coach` → send "Give me 2 cues for squat depth" → Confirm real-time token streaming and assistant response.
- [ ] **Session Teardown**:
  - Click User Nav dropdown → Log Out → Confirm cookies cleared and redirected to `/login`.
