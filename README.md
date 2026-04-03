# Lilt

Lilt is an **input-first English phrase learning app**.

It helps learners capture high-value phrases from external audio/text content, then review those phrases in short spaced sessions until they stick.

## Product intent

### What Lilt aims to be
- A lightweight app to learn from packs (audio + transcript).
- A place to save useful phrases quickly.
- A focused review loop for retention (not endless content generation).
- Mobile-first and local-first.

### What Lilt is *not*
- Not an AI chatbot.
- Not a free conversation practice app.
- Not a TTS generation tool.
- Not a backend/auth-heavy platform (for this MVP).

## MVP scope (implemented)

Screens:
- Home (`/`)
- Library (`/library`)
- Learn Pack (`/pack/[id]`)
- Review (`/review`)
- Phrase Detail (`/phrase/[id]`)
- Settings (`/settings`)

Core features:
- Static seed content (`content/seed.json`) with packs + phrases.
- Audio playback using external URLs.
- Transcript with simple phrase highlighting.
- Save phrase / mark confusing / want to use.
- Review queue with simple rating-based scheduler (`easy`, `close`, `hard`).
- Versioned local progress persistence via `localStorage`.
- Export / import / reset progress in Settings.

## Tech stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Local-first state persistence (`localStorage`)
- Static JSON content under `/content`
- Web app manifest for PWA-friendly setup (`public/manifest.webmanifest`)

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy on Vercel

This project is ready to deploy as a standard **Next.js App Router** application.

### 1) Import repository
- Go to Vercel and click **Add New Project**.
- Import this Git repository.
- Vercel should auto-detect the framework as **Next.js**.

### 2) Build settings
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: leave empty (default for Next.js)
- Node.js version: **20+** (also defined in `package.json` `engines`)

### 3) Environment variables
- No required environment variables for the current MVP.
- Data is static (`content/seed.json`) and user state is browser-local (`localStorage`).

### 4) Runtime behavior notes
- Because progress is stored in `localStorage`, saved progress is per-browser/per-device.
- No server-side database/auth configuration is needed for deployment.
- HTTPS on Vercel enables secure access to external audio URLs used by packs.

### 5) Recommended post-deploy checks
- Open `/`, `/library`, `/review`, `/settings`.
- Verify that audio playback works in `/pack/[id]`.
- Save a phrase, refresh, and verify progress is preserved in the same browser.
- Export/import progress once from Settings.

## Content structure

`content/seed.json` includes:
- `packs`: learning units with title, level, topic, transcript, audio URL, phrase references.
- `phrases`: target phrases with meanings, patterns, variants, contrasts, examples.
- `links`: reserved for explicit span mapping (currently inferred in code).

Core domain types are defined in `lib/types.ts`:
- `Pack`
- `Phrase`
- `PackPhraseLink`
- `UserProgressV1`

## Architecture notes

- `lib/content.ts`: content access layer (isolates static JSON from UI).
- `lib/reviewScheduler.ts`: review interval logic (replaceable later).
- `lib/progressStore.ts`: persistence and migration boundary.

## Future expansion ideas
- Swap static JSON with CMS/source sync.
- Replace scheduler with FSRS-like algorithm.
- Add phrase-level audio segment looping when precise timings are available.
- Optional IndexedDB storage for larger datasets.
- Better offline support with full service worker caching.
