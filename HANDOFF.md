# Handoff Notes

## Latest session update (2026-04-04, learner-side content/progress unification)

### Goal
Make learner data flow internally consistent so Home / Pack / Phrase detail / Review all use one content path and one progress model boundary.

### What changed
1. **Unified learner content repository added**
   - Added `lib/learnerContentRepository.ts` as the single learner-facing content source.
   - Repository behavior:
     - prefers learner APIs (`/api/packs`, `/api/packs/[id]`)
     - falls back to local seed-based `contentService` behind the same interface
   - Added phrase-level loaders that resolve authored phrase fields and linked pack context through pack detail data.

2. **Learner content hooks moved onto the repository**
   - Refactored `lib/usePacks.ts` to use the repository for:
     - published packs (`usePacks`)
     - pack detail (`usePackDetail`)
     - phrase detail (`usePhraseDetail`)
     - review phrase hydration (`usePhrasesByIds`)

3. **Learner progress access unified for UI derivations**
   - Added `lib/useLearnerProgress.ts` to centralize derived learner progress state:
     - due phrase ids/count
     - recent pack ordering
   - Screens now consume this instead of deriving due/recent directly via ad hoc `progressStore` calls.

4. **Learner screens migrated to coherent data flow**
   - `app/page.tsx` (Home): now uses unified learner progress selectors and repository-backed pack list.
   - `app/review/page.tsx` (Review): due queue now resolves phrase content through the unified learner content path.
   - `app/phrase/[id]/page.tsx` (Phrase detail): now loads phrase + linked packs via unified learner content path.
   - `app/pack/[id]/page.tsx` (Pack study): now consumes unified learner progress selectors for due count.

5. **README updated**
   - Added architecture note documenting learner-side data-flow unification and fallback behavior behind the repository boundary.

### Outcome
- Learner app no longer feels split between DB-backed pack study and local-only review/detail/home readers.
- Supabase-first behavior is preserved while keeping local fallback hidden behind one learner content abstraction.
- Progress derivations used by learner screens now come from one shared progress-access layer.

### Intentionally deferred
- Re-introducing richer pack-context rendering inside Review cards (e.g., subtitle snippets / transcript anchors).
- Scheduler redesign beyond current easy/close/hard model.
- Additional learner APIs dedicated to phrase lookup (current repository resolves phrase content via existing pack APIs).

### Next best task
1. Add lightweight **pack context in review** (pack title + tiny transcript anchor where available) while keeping current review speed model.
2. Improve **phrase timing quality usage** for more reliable phrase-level replay windows and tighter repetition loops.

---

## Latest session update (2026-04-04, Vercel warning/error follow-up)

### Goal
Address the latest Vercel production build issues:
- TypeScript failure in `app/settings/page.tsx` (`useProgress().update` missing)
- React Hooks exhaustive-deps warning in `app/pack/[id]/page.tsx`
- Next.js config warning about `experimental.typedRoutes`

### What changed
1. **Restored settings dependency contract**
   - Added `update` back to `useProgress`.
   - `update` applies a caller-provided mutator to progress and persists via `progressStore.save`.
   - This unblocks Settings import/reset actions that call `update(() => next)`.

2. **Resolved transcript `useMemo` dependency warning**
   - Updated dependency array in pack page transcript `useMemo` to include `pack` and `progress` directly.
   - This removes the `react-hooks/exhaustive-deps` warning reported in the build log.

3. **Updated Next.js typedRoutes config location**
   - Moved from:
     - `experimental: { typedRoutes: true }`
   - To:
     - `typedRoutes: true`
   - Aligns with Next.js 15.5 warning guidance.

4. **README updated**
   - Added a new section documenting this warning/error follow-up and what was changed.

### Outcome
- The reported Settings type error is fixed.
- The reported `useMemo` exhaustive-deps warning is fixed.
- Next.js typedRoutes deprecation warning is fixed.

## Latest session update (2026-04-04, follow-up hooks lint fix)

### Goal
Fix the remaining production lint/build failure reported by Vercel:
`React Hook "useMemo" is called conditionally` in `app/pack/[id]/page.tsx`.

### What changed
1. **Hook order made unconditional in pack learner page**
   - Moved `const phraseList` + transcript `useMemo` above early return branches.
   - Added a guard inside `useMemo` for pre-load renders (`if (!pack || !progress) return ""`).
   - Updated `useMemo` dependency expressions to null-safe access (`pack?.transcript`, `progress?.phraseProgress`).

2. **Docs updated**
   - README build reliability note now includes the exact `useMemo` ordering/guard fix.

### Outcome
- Hook invocation order is now stable across all renders.
- This directly addresses the Vercel `react-hooks/rules-of-hooks` failure in the pack page.

## Latest session update (2026-04-04, Supabase-first learner APIs)

### Goal
Implement learner-side data loading with a Supabase-first assumption now that Vercel env is configured.

### What changed
1. **Removed local content fallback from learner APIs**
   - `GET /api/packs` now returns an explicit `500` when Supabase env is missing or Supabase read fails.
   - `GET /api/packs/[id]` now returns an explicit `500` when Supabase env is missing or Supabase read fails.

2. **Client pack hooks now assume API-backed data**
   - `usePacks` now initializes from an empty list and handles non-OK API responses as fetch failures.
   - `usePackDetail` now initializes with `null`/empty values and handles non-OK API responses explicitly.

3. **README updated**
   - Added a new section documenting Supabase-first learner API behavior and removed outdated wording about local fallback scope.

### Outcome
- Production behavior now aligns with a Supabase-first deployment model.
- Misconfiguration and backend failures are surfaced clearly instead of silently falling back to local seed content.

---

## Latest session update (2026-04-04, Supabase env compatibility)

### Goal
Configure local env with the provided Supabase project values and ensure the app accepts Supabase's newer publishable key naming.

### What changed
1. **Local env configured**
   - Added `.env.local` with:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

2. **Runtime key fallback support**
   - Updated Supabase HTTP helper to accept either:
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (existing)
     - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (new dashboard naming)

3. **README env docs refreshed**
   - Environment variable section now documents both supported key names.

### Outcome
- Existing setups using `NEXT_PUBLIC_SUPABASE_ANON_KEY` keep working.
- New setups that only define `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` now work without extra changes.

## Latest session update (2026-04-04, Vercel build fix)

### Goal
Resolve production build failure caused by React Hooks ordering in the pack learner page.

### What changed
1. **Hook ordering fix in pack page**
   - Moved early returns (`notFound` / loading fallback) to run **after** all Hook declarations.
   - This ensures Hooks are always called in a stable order and satisfies `react-hooks/rules-of-hooks`.

2. **Safe pack id handling**
   - Updated the pack-open side effect to guard on `pack?.id` and use a local `packId` to avoid undefined access before data load.

### Outcome
- `npm run build` now passes lint/type checks where the previous Vercel log failed on conditional hook usage.

## Latest session update (2026-04-04, pack noticing pass)

### Goal
Improve **phrase noticing and in-context learning** on pack study pages without expanding admin/platform scope.

### What changed
1. **Transcript noticeability**
   - Added clearer, lightweight phrase highlighting states in transcript context:
     - neutral
     - saved
     - confusing
     - focused
   - Preserved readability and minimalist typography-first style.

2. **In-pack focus mode for a target phrase**
   - Added compact focused-phrase panel directly in pack view.
   - Panel shows phrase text, meaning, optional note, quick actions (save/confusing/want/detail), and keeps flow in-context.

3. **Phrase-audio connection (when timing exists)**
   - Added phrase-aware listening helpers:
     - jump to phrase timing
     - replay short phrase region
   - Clean fallback when timing metadata is absent.

4. **Lower cognitive load during study**
   - Added lightweight study mode toggle to focus on transcript + focused phrase and hide the larger phrase list unless needed.

### Intentionally postponed
- Rich timeline/waveform tooling.
- Full transcript editing/authoring tools.
- Advanced review algorithm changes.

### Next logical step
Refine phrase timing quality + add tiny context-window replay controls (e.g., ±0.5s presets) once timing coverage is reliable.

---

## Latest session update (2026-04-04)

### Goal
Prioritize learner-side daily usability so the flow feels coherent: continue pack -> study -> review -> resume.

### What changed
1. **Home became a clearer daily entry point**
   - Home now emphasizes only two primary actions:
     - Continue recent pack
     - Review due phrases
   - Secondary context is intentionally lightweight (due/saved + small recent list).

2. **Pack learning flow was tightened**
   - Pack status now reads as `new` / `in progress` / `completed` from progress.
   - Added a lightweight “Done for now” completion action and a clear transition to review.
   - Transcript highlighting now prefers authored phrase char spans (`start_char_index` / `end_char_index`) when available.
   - Missing audio remains graceful.

3. **Review experience simplified for speed**
   - Review loop is now focused: prompt -> reveal -> easy/close/hard.
   - Added clear empty-state action back to library.

4. **Phrase detail now supports action + continuation**
   - Compact learner-state line: saved/review state/due time.
   - Keeps authored notes/examples/variants/contrasts visible.
   - Added quick links to continue review or return to a related pack.

5. **Docs update**
   - README updated with learner flow polish notes and current UX intent.

### Intentionally postponed
- Advanced scheduling algorithm changes.
- Rich transcript interactions beyond simple span highlighting.
- Broad admin tooling expansion.

### Next logical step
Further improve **in-pack noticing ergonomics** (tap/seek interactions around highlighted phrase spans) before deepening review algorithm complexity.

---

## Previous major update (2026-04-04, earlier in the day)

### Added foundation
- Private Supabase audio signed-url resolution for learner pack APIs.
- Supabase-backed learner progress repository with local fallback.
- Action-oriented `useProgress` API for pack/phrase/review updates.
- Light admin polish (published visibility + audio version visibility + linked phrase scanning).

### Still true after latest pass
- Authenticated mode prefers server progress.
- Local fallback remains separate and non-blocking.
- Scope remains intentionally product-light (no chatbot/analytics/platform expansion).

---

## Historical context (2026-04-03)

- RLS/read model tightening for published learner content.
- DB-backed pack APIs for authored content.
- Phrase reuse in admin, audio versioning, and admin protection hardening.
- Minimalist learner UI refresh.
