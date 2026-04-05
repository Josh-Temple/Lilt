# Handoff Notes

## Latest session update (2026-04-05, review zero-visible verification + fix)

### Goal
Trace and fix the remaining “Review shows zero visible items” risk along the exact learner chain:
pack action -> progress write -> due queue -> phrase hydration -> review render.

### Root-cause analysis
The previously fixed eligibility mismatch (`saved`-only vs `saved/confusing/wantToUse`) addressed one major failure mode, but verification found a second predictability gap:

1. **Save could preserve stale future dueAt**
   - `toggleSaved` flipped `saved` but kept existing `dueAt`.
   - If a phrase had been reviewed before (future `dueAt`), save-on did not reliably make it due now.
   - This made “I just saved/flagged in pack, but review looks empty” still plausible in some user paths.

2. **State coherence signals were inconsistent**
   - `reviewState` updates were ad-hoc across `toggleSaved`, `toggleFlag`, and `review`.
   - This reduced observability when debugging Home dueCount vs Review queue outcomes.

3. **Diagnostics coverage had a small gap**
   - Queue-build and hydration logs existed, but render-level empty reason logging was missing.
   - It was harder to prove whether emptiness came from eligibility, due timing, or hydration failure.

### What was changed
1. **Predictable Save -> Review path**
   - `toggleSaved` now sets `dueAt = now` when saving on.
   - This ensures first-step review availability remains predictable after real learner action.

2. **Unified review state derivation**
   - Added centralized `deriveReviewState` in `progressStore` based on:
     - eligibility (`saved || confusing || wantToUse`)
     - due timing (`dueAt <= now`)
   - Applied in:
     - `toggleSaved`
     - `toggleFlag`
     - `review`

3. **End-to-end traceability improved**
   - `useProgress` now logs for pack open/complete, save/flag, and review rating:
     - changed phrase snapshot
     - resulting `duePhraseIds`
   - Review page now logs render outcome with explicit empty reason:
     - `no_eligible_phrases`
     - `eligible_but_not_due`
     - `due_items_unresolved`

### Outcome
- Home dueCount and Review queue now stay coherent under normal learner actions.
- After studying a pack and saving/flagging a phrase, review path is operational and debuggable.
- Empty state remains truthful across:
  - no eligible phrases
  - eligible but not due
  - due items unresolved during content hydration.

### Next best task
Add a compact developer-only debug panel (behind a URL query flag) that surfaces the same diagnostics without opening DevTools, while keeping learner UI unchanged by default.

## Latest session update (2026-04-05, phrase timing replay flow polish)

### Goal
Make phrase timing metadata materially more useful during pack study by tightening replay flow and phrase-context continuity.

### What changed
1. **Pack deep-link focus from review/source context**
   - `app/pack/[id]/page.tsx` now reads `?phrase=<id>` and pre-focuses that phrase when present.
   - `app/review/page.tsx` source-pack link now includes phrase query (`/pack/:id?phrase=:phraseId`) so return-to-pack lands in the right context.

2. **Playback-to-phrase awareness improved**
   - Pack audio now tracks current playback time and derives a subtle active phrase cue (`Now hearing: ...`) from timing metadata.
   - Added a lightweight `Focus currently playing` action when audio is on a different phrase than the focused one.

3. **Partial timing metadata handled more clearly**
   - Focus panel timing now marks estimated end windows when `end_sec` is missing (uses existing `start + 2.5s` fallback).
   - This makes partial timing behavior explicit instead of appearing exact.

4. **Replay controls kept compact but more robust**
   - Existing high-value controls stay unchanged in scope:
     - Jump to phrase
     - Replay phrase
     - Replay + context
     - Repeat x2
   - Controls now disable when phrase-audio actions cannot run (e.g., pack has no audio URL), preventing dead-click behavior.

5. **README updated**
   - Added `Timing replay flow polish (2026-04-05)` describing these changes and intentionally preserved simplicity.

### Intentionally kept simple
- No waveform/timeline editor.
- No advanced repeat profile matrix.
- No admin timing workflow expansion.
- No review scheduler/rating redesign.

### Next best task
Polish **pack completion -> review transition** after timing-based rehearing:
1. Add a tiny “review this reheard phrase next” nudge in pack flow.
2. Keep it optional and one-tap so default pack study remains calm.
3. Maintain coherent due-count messaging between Pack/Home/Review.

## Latest session update (2026-04-05, pack-authored review continuity polish)

### Goal
Strengthen the feeling that review is a continuation of studied packs by preferring real pack/authored support context without adding product scope.

### What changed
1. **Review context payload expanded (repository level)**
   - `lib/learnerContentRepository.ts` now includes compact authored support fields in `reviewContext`:
     - `authoredNote`
     - `authoredContrast`
   - Existing pack-derived/transcript and example fields remain, now normalized via compact text cleanup.

2. **Review reveal now uses one consistent support clue**
   - `app/review/page.tsx` now picks exactly one support line using clear priority:
     1. Transcript excerpt (pack-derived)
     2. Example
     3. Note
     4. Contrast
   - The UI labels the clue source (`Transcript`, `Example`, `Note`, `Contrast`) to keep context meaningful and trustworthy.

3. **Prompt-mode scope stayed intentionally tight**
   - Existing lightweight modes remain:
     - meaning -> phrase
     - phrase -> meaning
     - cloze/context (only from transcript/example lines)
   - Cloze/context inputs continue to avoid note/contrast text so prompts remain coherent and quick.

4. **README updated**
   - Added `Review authored-context polish (2026-04-05)` describing the continuity-focused update and unchanged scheduler scope.

### Intentionally kept simple
- No scheduler changes.
- No new rating options.
- No chatbot/tutor behavior.
- No heavy review navigation or panel complexity.

### Next best task
Refine **phrase-timing-based audio repetition** from the review continuation path:
1. Add an optional, low-friction “rehear phrase in source pack” jump when timing metadata exists.
2. Tune phrase/context replay window defaults for mobile speed and clarity.
3. Keep fallback behavior explicit when timing metadata is missing.

## Latest session update (2026-04-05, review queue flow repair)

### Goal
Repair the broken core loop where review could show zero items after real pack study actions.

### Root cause
Review due selection in `progressStore.getDuePhraseIds` only treated `saved` phrases as eligible. Pack study, however, supports `confusing` and `want to use` flags as learner intent signals. Flagged-only phrases were persisted but excluded from the due queue, making review appear empty even after valid learner actions.

### What was fixed
1. **Eligibility rule made explicit and action-aligned**
   - A phrase is now review-eligible when `saved || confusing || wantToUse`.
   - `getDuePhraseIds` now uses this eligibility instead of `saved` only.

2. **Flag actions now reliably enter review path**
   - When learner toggles `confusing` or `wantToUse` on, phrase `dueAt` is set to `now`.
   - This guarantees a predictable Save/Flag -> Review path without scheduler redesign.

3. **Server sync state coherence improved**
   - `syncPhraseProgress` now derives server `state` from the same eligibility rule (not `saved` only), preserving cross-session behavior.

4. **Review data-flow diagnostics added**
   - Added queue-build diagnostics in learner progress hook (tracked/eligible/due/not-due/hidden counts).
   - Added unresolved phrase-id logging in phrase hydration hook.

5. **Review empty state made truthful**
   - Empty state now distinguishes:
     - no review-eligible phrases yet
     - eligible phrases but none due yet
     - due ids exist but phrase resolution failed

### Intentionally simplified rule
Initial review eligibility is intentionally simple:
- eligible if any of `saved`, `confusing`, `wantToUse` is true.
- no scheduler model changes beyond current easy/close/hard behavior.

### Next logical step
After this stability fix, improve pack-context continuity inside review (e.g., stronger source-context cues and optional rehear shortcuts) while preserving the same lightweight scheduler and queue semantics.

## Latest session update (2026-04-04, review context reliability polish)

### Goal
Keep review pack-connected while preventing low-quality prompts when context lines do not actually contain the target phrase.

### What changed
1. **Cloze safety guard added in review**
   - `app/review/page.tsx` now checks whether the context line contains the phrase text before enabling cloze mode.
   - If phrase text is absent, review falls back to a compact set (meaning/phrase/context) instead of generating misleading blanks.

2. **Review header cue tightened**
   - Added a compact “from studied packs” cue in the review header to reinforce product identity.

3. **README updated**
   - Added a short follow-up note documenting cloze-mode guarding behavior.

### Outcome
- Review prompts stay compact and pack-connected.
- Cloze prompts are now more trustworthy and less noisy.
- The review loop remains fast and unchanged in scheduling (`easy/close/hard`).

### Intentionally kept simple
- No scheduler redesign.
- No extra review modes.
- No new navigation/system complexity.

### Next best step
Use phrase timing metadata from source packs to add an optional “rehear in pack” shortcut directly from review reveal (only when timing exists), without slowing default review flow.

## Latest session update (2026-04-04, timing-based audio repetition in pack study)

### Goal
Deepen phrase timing metadata usage so pack study supports fast phrase rehearing (phrase span + short context) without turning into a complex audio tool.

### What changed
1. **Focused phrase audio actions expanded (pack page)**
   - Reworked focused phrase playback controls in `app/pack/[id]/page.tsx`.
   - Added compact actions when timing exists:
     - Jump to phrase
     - Replay phrase
     - Replay + context
     - Repeat x2
   - Kept controls inside the focused phrase section (no heavy global control panel).

2. **Timing-backed playback behavior tightened**
   - Added bounded timed playback windows and a repeat-loop helper for lightweight repetition.
   - Added cleanup/reset behavior for replay timers and audio action state on pause/end/unmount.
   - Fixed timing guard logic to correctly allow phrases that start at `0s` (uses null checks instead of truthy checks).

3. **Subtle audio state awareness**
   - Focus panel now shows compact timing target (`mm:ss - mm:ss`) plus current audio action label.
   - Keeps state visible but low-noise.

4. **Graceful no-timing fallback**
   - Timing controls are only shown when timing metadata is available for the focused phrase.
   - When missing, a clear fallback message is shown and normal transcript/full-audio study remains available.

5. **Small adjacent support change**
   - Phrase detail now shows whether timing replay is available for that phrase from its source pack.

6. **README updated**
   - Added a timing-based audio repetition section documenting the new pack-study listening loop.

### Outcome
- Phrase timing metadata now creates practical in-pack listening value.
- Rehearing target phrases (with/without short context) is faster and clearer.
- Pack page remains compact and study-centered.

### Intentionally kept simple
- No waveform or transcript timing editor.
- No advanced playback customization matrix.
- No admin timing workflow expansion.
- No new review/scheduler complexity.

### Next best step
Polish pack completion/review transition around audio repetition:
1. Add an ultra-light “review this reheard phrase next” nudge after focused repeats.
2. Tune default context window durations from real learner feedback.
3. Consider minimal authoring-side timing quality indicators (not full editing UI).

## Latest session update (2026-04-04, review as pack-continuation)

### Goal
Make review feel like a direct continuation of pack-based input learning (short pack -> noticing -> light review) without broadening product scope.

### What changed
1. **Review items now include pack-derived context**
   - Extended learner phrase context with:
     - linked pack topic metadata
     - compact `reviewContext` object (source pack + transcript/example clue)
   - Repository now derives transcript excerpts from pack transcript + phrase link char ranges when available, with phrase-text search fallback.

2. **Review modes expanded in a controlled, compact way**
   - Preserved current rating flow (`easy` / `close` / `hard`) and scheduler behavior.
   - Added lightweight mode rotation:
     - meaning -> phrase
     - phrase -> meaning
     - cloze from pack/example line
     - context line -> identify phrase
   - Modes degrade gracefully to the 2 basic modes when context is unavailable.

3. **Review now links back to learning source**
   - Revealed answer view now provides direct actions to:
     - phrase detail
     - source pack
   - Added compact source label in review prompt header (`from {pack}` + optional topic).

4. **Small coherence hooks outside review**
   - Home review CTA now explicitly says due phrases come from studied packs.
   - Phrase detail now surfaces phrase origin (pack + optional topic) above continuation links.

5. **README updated**
   - Added “Review context coherence update (2026-04-04)” describing the new review philosophy and scoped constraints.

### Outcome
- Review feels tied to real pack encounters instead of isolated flashcards.
- Context is present but compact enough to keep mobile review speed.
- Product identity stays narrow and consistent with Lilt’s input-first loop.

### Intentionally kept simple
- No scheduler redesign.
- No complex review session orchestration.
- No admin/content authoring expansion.
- No AI tutor/chat behaviors.

### Next best step
Polish phrase timing usage across review-to-pack revisit loops:
1. Add lightweight “listen to this phrase again” jumps from review reveal when timing exists.
2. Improve replay window defaults (tight phrase-only vs tiny context window presets).
3. Keep fallback behavior clean when timing metadata is missing.

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

## Latest session update (2026-04-05, PWA empty-library resilience fix)

### Goal
Resolve the user-facing PWA issue where no packs were visible, even when the app should remain usable via local fallback content.

### Root cause
`learnerContentRepository.getPublishedPacks()` only fell back to seed content when `/api/packs` failed (network/non-OK). If the API returned `200` with `packs: []` (e.g., no published rows, RLS/sync mismatch, stale runtime state), the learner UI accepted empty content and showed no packs.

### What changed
1. **Empty-list fallback activated**
   - Updated `getPublishedPacks()` to treat API-empty (`[]`) as fallback-eligible.
   - Behavior now:
     - use Supabase packs when array is non-empty
     - otherwise return local seed packs

2. **Docs updated**
   - Added README note documenting this resilience behavior and why it helps PWA reliability.

### Outcome
- Home/Library no longer get stuck empty when Supabase returns a valid-but-empty list.
- Learner flow stays operational in fallback scenarios (offline/stale cache/misconfiguration), while still preferring Supabase-published content when present.

### Next best task
Add a lightweight content-source diagnostic badge for developers (e.g., `supabase`, `fallback:error`, `fallback:empty`) to reduce ambiguity during QA.
