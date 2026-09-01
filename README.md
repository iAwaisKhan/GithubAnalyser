# GitHub Analyzer

Full-stack GitHub profile analyzer that generates explainable developer insights and resume-ready highlights.

## Features

- Repository quality scoring and AI reviews
- Contribution consistency, streak, and language analysis
- Developer persona, growth tracking, and profile comparison
- Shareable reports and downloadable profile cards
- OAuth authentication, usage limits, caching, and rate limiting

## Tech Stack

Next.js, React, TypeScript, Tailwind CSS, Node.js, PostgreSQL, Redis, GitHub REST/GraphQL, Anthropic, NextAuth, Stripe, Vitest, and GitHub Actions.

## Setup

```bash
npm ci
cp .env.local.example .env.local
npm run dev
```

For Windows PowerShell:

```powershell
Copy-Item .env.local.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

See [.env.local.example](./.env.local.example) for configuration. `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are required; other integrations are optional.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run test:run
npm run test:coverage
npm run typecheck
```

## Structure

```text
app/          Pages and API routes
components/   UI components
lib/          Application logic and integrations
tests/        Unit tests
.github/      CI workflow
```
