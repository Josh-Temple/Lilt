# Handoff Notes

## Current completion status

Implemented MVP foundation from scratch as a local-first Next.js app.

### Completed
- Project bootstrap with Next.js + TypeScript + Tailwind.
- Domain schema (`Pack`, `Phrase`, `PackPhraseLink`, `Progress`).
- Seed content (8 packs, 32 phrases).
- Content access layer abstraction.
- Versioned local progress store with migration boundary.
- Separated review scheduler module.
- Implemented screens:
  - Home
  - Library
  - Learn Pack
  - Review
  - Phrase Detail
  - Settings
- Added manifest for PWA-friendly metadata.
- Updated README with product definition + setup + architecture.

## Not implemented yet
- Explicit `segments` based phrase-level replay UI (current audio is full-track).
- Strong transcript span mapping (current highlight is lightweight string-based).
- Dedicated completion-marking UX per pack.
- Advanced scheduler (FSRS or adaptive memory model).
- Robust offline service worker caching strategy.
- Automated tests.

## Priority suggestions for next session
1. Add deterministic phrase span mapping in content data (`links` + optional timestamps).
2. Improve Learn Pack with segment looping when timestamps exist.
3. Add unit tests for:
   - scheduler behavior
   - progress migration/load/save
   - content lookups
4. Add simple E2E smoke test for critical flows.
5. Improve accessibility (focus states, ARIA labels, contrast review).

## Data model assumptions
- `UserProgressV1` is source-of-truth in localStorage key `lilt-progress`.
- Phrase progress exists lazily and is backfilled by `ensureSeed`.
- Saved phrases are review candidates; due queue is date-based.
- Content source is static `content/seed.json` and wrapped via `contentService`.

## Change safety notes
- Keep scheduler logic isolated in `lib/reviewScheduler.ts`.
- Preserve migration boundary in `progressStore.migrate` when changing progress schema.
- If changing phrase text format, verify transcript highlighter and cloze generator still work.
- If replacing content source, keep `contentService` API stable to avoid page-level rewrites.
