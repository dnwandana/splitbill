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
