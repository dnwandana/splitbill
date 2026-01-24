<div align="center">

# SplitBill

**AI-powered bill splitting made simple**

Snap a receipt, let AI extract the items, assign who had what, and get instant fair splits.

</div>

---

## Features

- **AI-Powered Receipt Scanning** - Upload a receipt image and let AI extract items, quantities, and prices automatically using vision models
- **Smart Item Assignment** - Assign items to participants with simple clicks. Support for quantity-based sharing (e.g., 3 people split 1 appetizer)
- **Real-Time Calculations** - Instant breakdown of who owes what, including proportional tax allocation
- **30+ Currency Support** - Automatic locale detection with support for 30+ currencies worldwide
- **Privacy-First Design** - No accounts, no database, no persistent data. Everything stays in your browser
- **Mobile Optimized** - Fully responsive design that works seamlessly on desktop and mobile devices

## How It Works

SplitBill guides you through a simple 5-step workflow:

1. **Upload** - Take a photo or upload an image of your receipt (JPEG, PNG, or WebP up to 10MB)
2. **Participants** - Add the people who were part of the meal
3. **Review** - AI extracts all items, quantities, and prices. Edit if needed
4. **Assign** - Click on items to assign them to each person. Share items by quantity
5. **Results** - See exactly who owes what, with tax distributed proportionally

## Quick Start

### Prerequisites

- Node.js v24 or later
- npm or yarn package manager
- [OpenRouter API key](https://openrouter.ai/) (for AI receipt parsing)

### Environment Setup

1. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory (or copy the example):

```bash
cp .env.example .env
```

4. Configure your environment variables:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
COMPLETION_MODEL=qwen/qwen3-vl-8b-instruct
UMAMI_WEBSITE_ID=your_umami_website_id_here
```

### Environment Variables

| Variable             | Description                                                                        | Required |
| -------------------- | ---------------------------------------------------------------------------------- | -------- |
| `OPENROUTER_API_KEY` | API key from [OpenRouter](https://openrouter.ai/).                                 | Yes      |
| `COMPLETION_MODEL`   | Vision model that supports structured output. Default: `qwen/qwen3-vl-8b-instruct` | Yes      |
| `UMAMI_WEBSITE_ID`   | Website ID for Umami analytics (anonymous, cookie-free). Leave empty to disable.   | No       |

### Run Development Server

Start the development server on `http://localhost:3000`:

```bash
npm run dev
```

## Docker Deployment

SplitBill includes a production-ready Docker setup with nginx reverse proxy.

### Using Docker Compose (Recommended)

1. Ensure the `.env` file is configured with your API keys

2. Build and start the services:

```bash
docker-compose up -d
```

3. The app will be available on `http://localhost` (port 80)

### Docker Build Only

If you prefer to manage the container manually:

```bash
docker build -t splitbill .
docker run -p 3000:3000 \
  -e OPENROUTER_API_KEY=your_key \
  -e COMPLETION_MODEL=qwen/qwen3-vl-8b-instruct \
  --name splitbill \
  splitbill
```

### SSL/HTTPS Setup

For production deployments with HTTPS:

1. Place your SSL certificates in `./ssl/` directory:
   - `ssl/fullchain.pem` - Your certificate chain
   - `ssl/privkey.pem` - Your private key

2. Ensure `nginx.conf` is configured for SSL (port 443)

3. Start with docker-compose as above

## Tech Stack

| Category        | Technology                                              |
| --------------- | ------------------------------------------------------- |
| **Framework**   | [Nuxt 4](https://nuxt.com) - Vue 3 Meta Framework       |
| **Language**    | [TypeScript 5.8](https://www.typescriptlang.org)        |
| **UI Library**  | [@nuxt/ui](https://ui.nuxt.com) + Tailwind CSS          |
| **Validation**  | [Zod](https://zod.dev)                                  |
| **AI Provider** | [OpenRouter API](https://openrouter.ai) (Vision Models) |
| **Analytics**   | [Umami](https://umami.is) (Cookie-free, optional)       |
| **Runtime**     | Node.js v24 (Alpine Linux)                              |
| **Web Server**  | nginx (production)                                      |

## Architecture

### Single-Page Application Pattern

SplitBill is intentionally designed as a single-page app with all state, UI, and logic in `src/pages/index.vue`. This architecture is ideal for:

- Simple workflow applications
- Reduced complexity for small teams
- Easy state management without external stores

### Background AI Processing

Receipt parsing happens asynchronously via OpenRouter's vision API while users continue through the workflow. The AI extraction doesn't block the user experience.

### Proportional Tax Splitting

Tax is distributed fairly based on each participant's share of the total bill:

```
Participant Tax = (Participant Items Total / Overall Subtotal) × Total Tax
```

This ensures that someone who ordered a $5 appetizer pays less tax than someone who ordered a $50 steak.

### Directory Structure

```
src/
├── pages/
│   └── index.vue                    # Single-page app (all state & UI)
├── server/
│   └── api/
│       └── parse/
│           └── index.post.ts         # AI receipt parsing endpoint
├── composables/
│   └── useAnalytics.ts               # Umami analytics integration
└── utils/
    └── currency.ts                   # Locale/currency detection (30+ currencies)
```

## Privacy & Security

SplitBill is designed with privacy as a core principle:

- **No Persistent Data** - All data is stored in-memory only. Nothing is saved to databases.
- **No User Accounts** - No sign-up, login, or personal information required.
- **No Tracking Cookies** - Umami analytics is completely cookie-free and anonymous.
- **Receipt Images** - Images are sent to OpenRouter for parsing and not stored afterwards.
- **Open Source** - Full transparency into how the application works.

## Development

### Available Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run generate # Static site generation
npm run preview  # Preview production build
```
