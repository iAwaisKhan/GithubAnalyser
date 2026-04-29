# GitHub Analyzer — Production-Ready AI Developer Intelligence Platform

A full-stack Next.js SaaS with authentication, billing, rate limiting, caching, and comprehensive testing.

## 🚀 Quick Start

```bash
npm install
cp .env.local.example .env.local
# Edit .env.local with your API keys (see below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🔑 Environment Variables

### Required for core features
```env
ANTHROPIC_API_KEY=sk-ant-...          # AI insights
```

### Required for auth
```env
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
GITHUB_CLIENT_ID=...                  # github.com/settings/developers
GITHUB_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...                  # console.cloud.google.com
GOOGLE_CLIENT_SECRET=...
```

### Recommended
```env
GITHUB_TOKEN=ghp_...                  # Raises API rate limit 60→5000/hr
DATABASE_URL=postgres://...           # Growth tracker + user accounts
```

### Optional (Redis — rate limiting + caching)
```env
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### Optional (Stripe — billing)
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Optional (cron security)
```env
CRON_SECRET=<random string>
```

---

## 📁 Project Structure

```
app/
  page.tsx                        # Main analyzer
  compare/page.tsx                # ⚔️ Compare two users
  dashboard/page.tsx              # User dashboard
  billing/page.tsx                # Pricing + subscription
  auth/
    signin/page.tsx               # OAuth sign-in
    error/page.tsx                # Auth error page
  api/
    auth/[...nextauth]/route.ts   # NextAuth handler
    github/route.ts               # Main analysis API
    compare/route.ts              # Compare API
    billing/
      checkout/route.ts           # Stripe checkout
      portal/route.ts             # Stripe billing portal
      webhook/route.ts            # Stripe webhook handler
    cron/
      reset-usage/route.ts        # Monthly usage reset

components/
  AuthHeader.tsx                  # Nav with user info + plan
  ErrorBoundary.tsx               # React error boundary
  Skeletons.tsx                   # Loading skeleton components
  Providers.tsx                   # NextAuth session provider
  GithubForm.tsx                  # Username input
  ProfileCard.tsx                 # Avatar + stats
  RepoCard.tsx                    # Scored repo + AI review
  ContributionHeatmap.tsx         # 90-day activity grid
  LanguageChart.tsx               # Animated language bars
  StrengthWeakness.tsx            # AI analysis panel
  ResumeSection.tsx               # Resume bullets
  PersonaBadge.tsx                # Developer DNA
  ProfileCardPreview.tsx          # 3-style downloadable card
  GrowthTracker.tsx               # Snapshot diffs + sparklines
  CompareView.tsx                 # Side-by-side comparison
  StorySection.tsx                # Contribution narrative

lib/
  ai.ts                           # All Claude API calls
  auth.ts                         # NextAuth config + DB user ops
  billing.ts                      # Stripe helpers + plan config
  consistency.ts                  # Streak + heatmap logic
  db.ts                           # PostgreSQL connection pool
  graphql.ts                      # GitHub GraphQL API client
  growth.ts                       # DB snapshot logic
  languages.ts                    # Language aggregation
  persona.ts                      # Developer persona detection
  ratelimit.ts                    # Upstash rate limiting
  redis.ts                        # Redis cache helpers
  scoring.ts                      # Repo quality scoring

__tests__/
  scoring.test.ts                 # 12 tests
  consistency.test.ts             # 14 tests
  persona.test.ts                 # 9 tests
  languages.test.ts               # 14 tests
```

---

## 🗓️ Feature Days

| Day | Feature | Status |
|-----|---------|--------|
| 1 | GitHub profile + repo fetch | ✅ |
| 2 | Repo quality scoring + AI reviews | ✅ |
| 3 | Contribution heatmap + streak analysis | ✅ |
| 4 | Language intelligence + strengths/weaknesses | ✅ |
| 5 | AI resume bullet generator | ✅ |
| 6 | Developer DNA persona + profile card download | ✅ |
| 7 | Growth tracker + compare mode + story mode | ✅ |
| 8 | Auth + billing + rate limiting + caching + tests | ✅ |

---

## 🏭 Production Gaps (All Resolved)

| Gap | Solution |
|-----|----------|
| Authentication | NextAuth v4 with GitHub + Google OAuth |
| Rate Limiting | Upstash Ratelimit (sliding window, per-plan) + memory fallback |
| Response Caching | Upstash Redis (5–10 min TTL, invalidation support) |
| GitHub History depth | GraphQL `contributionsCollection` (1yr) + Events API fallback |
| Billing / Usage | Stripe subscriptions + webhook handler + monthly cron reset |
| Error Boundaries | React ErrorBoundary on every section + skeleton loaders |
| Testing | Vitest — 49 tests across scoring, consistency, persona, languages |

---

## 🧪 Running Tests

```bash
npm run test          # watch mode
npm run test:run      # single run
npm run test:coverage # coverage report
```

---

## 🗄️ Database Schema

Auto-created on first run:

```sql
-- Users table (auth + billing)
CREATE TABLE users (
  id                SERIAL PRIMARY KEY,
  email             TEXT UNIQUE NOT NULL,
  name              TEXT,
  image             TEXT,
  github_username   TEXT,
  plan              TEXT DEFAULT 'free',
  analyses_used     INT  DEFAULT 0,
  stripe_customer_id TEXT,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

-- Growth tracking snapshots
CREATE TABLE user_snapshots (
  id                SERIAL PRIMARY KEY,
  username          TEXT NOT NULL,
  repo_count        INT,
  total_stars       INT,
  consistency_score INT,
  avg_repo_score    INT,
  top_language      TEXT,
  created_at        TIMESTAMP DEFAULT NOW()
);
```

Recommended: [Neon](https://neon.tech) (free tier) or [Supabase](https://supabase.com)

---

## 💳 Plan Limits

| Plan | Price | Analyses/month | Features |
|------|-------|----------------|----------|
| Free | $0 | 5 | All core features |
| Pro | $9/mo | 100 | + Compare Mode, Story Mode |
| Enterprise | $49/mo | Unlimited | + API access, team accounts |

---

## 🚀 Deploy to Vercel

```bash
vercel deploy
```

Set all env vars in Vercel Dashboard. Cron job (`vercel.json`) automatically resets usage on the 1st of each month.

### Stripe Webhook Setup
```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```
In production: add `https://yourdomain.com/api/billing/webhook` in Stripe Dashboard → Webhooks.
