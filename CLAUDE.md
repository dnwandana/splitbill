# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run generate # Static site generation
npm run preview  # Preview production build
```

## Project Architecture

**SplitBill** is an AI-powered bill splitting application built with Nuxt 4. The entire application is a single-page wizard contained in `src/pages/index.vue` that guides users through 6 steps: landing → upload → participants → review → assign → results.

### Key Design Decisions

- **Single-file architecture**: All app state, UI, and logic lives in `src/pages/index.vue`. This is intentional for this simple workflow.
- **Background AI processing**: Receipt parsing via OpenRouter happens asynchronously while users continue through the workflow.
- **No persistent storage**: Privacy-first design with no user accounts or database. All state is in-memory.
- **Editorial design system**: Custom CSS with sophisticated animations and typography (serif/sans/mono) for a premium feel.

### Directory Structure

```
src/
├── pages/
│   └── index.vue             # Single-page app (all state, UI, and logic)
├── server/
│   └── api/
│       └── parse/
│           └── index.post.ts  # AI receipt parsing endpoint (OpenRouter vision API)
├── utils/
│   └── currency.ts           # Locale/currency detection, 30+ currencies supported
└── composables/
    └── useAnalytics.ts        # Umami analytics (cookie-free)
```

### Core Components

**AI Receipt Parsing** (`src/server/api/parse/index.post.ts`):
- Uses OpenRouter's vision models with structured JSON output
- Validates multipart form data with Zod
- Supports JPEG, PNG, WebP up to 10MB
- Extracts: items (name, quantity, price), tax, total

**Currency System** (`src/utils/currency.ts`):
- Auto-detects locale from browser (`navigator.language`)
- Maps regions to currencies (EUR regions handled separately)
- Formats using `Intl.NumberFormat` with fallback to USD

**Splitting Algorithm** (in `src/pages/index.vue`):
- Proportional tax allocation based on each participant's assigned items
- Supports quantity-based sharing (e.g., 3 people split 1 appetizer)
- Real-time calculation updates as assignments change

### Environment Variables

```env
OPENROUTER_API_KEY=your_key
COMPLETION_MODEL=qwen/qwen3-vl-8b-instruct  # Must support vision + structured output
UMAMI_WEBSITE_ID=your_id
```

### Technology Stack

- **Framework**: Nuxt 4 (Vue 3 Composition API, SSR enabled)
- **UI**: @nuxt/ui components + custom editorial CSS
- **Validation**: Zod for API validation
- **Styling**: TailwindCSS
- **Analytics**: Umami (cookie-free)

### When Modifying Code

- Most changes will happen in `src/pages/index.vue` due to the single-file architecture
- The `itemAssignments` ref uses `Record<number, Record<number, number>>` structure: outer key = item index, inner key = participant index, value = quantity
- Tax is distributed proportionally based on each participant's `itemsTotal` vs overall `subtotal`
- Analytics events are tracked at step boundaries using the `useAnalytics` composable

## Development & QA Baseline

QA scripts now exist — use them:

```bash
npm run typecheck    # nuxt typecheck (requires vue-tsc devDep — pinned to 2.x, see below)
npx eslint .         # lint
npm test             # node:test unit suites (split, rate-limit, receipt)
npm run build        # production build (needs network to Google Fonts at build time)
```

Baseline after the 2026-06-22 audit remediation:

- **Lint:** passes — 0 errors, 0 warnings.
- **Type check:** **passes** (exit 0). Enabled by adding `@types/node` + `vue-tsc` devDeps and `allowImportingTsExtensions` in **both** `typescript.tsConfig` and `nitro.typescript.tsConfig` (the latter is needed for the server tsconfig). `vue-tsc` is pinned to **`^2.2.12`** — v3.x is incompatible (its `@vue/language-core` probes a `vue-router/volar` subpath).
- **Tests:** `node:test` suites for the pure logic — `src/utils/split.test.ts`, `src/server/utils/{receipt,rate-limit}.test.ts` (17 tests). The split/tax math is deduped into `src/utils/split.ts` (`computeSplit` + `allocateRoundedTotals`), used by both `participantTotals` and `calculateSplit`.
- **Build:** passes; main chunk still dominated by `@nuxt/ui` (used only for `<UApp>`; lighter-weight replacement deferred).
- **`npm audit`:** 1 low (Windows-only dev esbuild; only a forbidden major bump would clear it). Was 36 (2 critical, 18 high).
- **Rate limiting:** `/api/parse` is rate-limited per-IP (in-memory) via `src/server/middleware/rate-limit.ts` (defaults 5/min, 20/hour; env `RATE_LIMIT_PER_MIN`/`RATE_LIMIT_PER_HOUR`), plus an early 10MB size guard and an nginx `limit_req` scoped to `location = /api/parse`. The middleware only trusts `X-Forwarded-For` when `TRUST_PROXY=true` (docker-compose sets it; XFF is spoofable on direct exposure, so default is the socket IP). The in-memory store is bounded by *active* IPs via `sweepRateLimitStore` (called from the middleware once the store grows past 10k keys), not just per-key timestamp pruning.
- **Versions:** Nuxt 4, **@nuxt/ui 4.x**, **vue-router 5.x**, zod 4.x, vue 3.5.x (majors applied 2026-06-22).
- **Fonts:** loaded from Google Fonts + Fontshare via `<link>` tags in `nuxt.config.ts` (third-party request; build-time fetch). Accepted tradeoff; self-hosting deferred.

Conventions to preserve (from project constraints): **no new runtime dependencies** (devDep exceptions: `@types/node`, `vue-tsc`) and **privacy-first / no persistent storage** (no DB, no accounts, in-memory state only).
