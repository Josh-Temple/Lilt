# Lilt

Lilt is an **input-first English phrase learning app** with a private authoring console.

## Current architecture (daily-usable MVP)

Lilt now uses a two-layer model:
- **Shared content layer**: packs, phrases, links, and audio metadata.
- **Per-user progress layer**: phrase and pack progress separated by `user_id`.

The learner loop is now end-to-end:
1. open published pack
2. play private pack audio (signed URL)
3. save/flag phrases
4. review due phrases
5. keep progress across sessions/devices for authenticated users

## Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Supabase Auth (magic link), Postgres (content + progress), Storage (audio bucket)
- Local progress store remains as fallback only for per-user progress when auth is unavailable

## Implemented now

- Private audio delivery on learner APIs now uses **server-resolved signed URLs**.
  - `GET /api/packs`
  - `GET /api/packs/[id]`
  - Dedicated resolver: `lib/supabase/audioResolver.ts`
- Learner progress sync service added:
  - `lib/progressRepository.ts`
  - `lib/useProgress.ts`
- Authenticated users now read/write:
  - `user_phrase_progress`
  - `user_pack_progress`
- Local fallback behavior preserved when:
  - Supabase env is missing
  - user is not authenticated
  - Supabase calls fail
- Review queue now comes from persisted progress loaded at startup (server preferred when authenticated).
- Home now emphasizes daily loop actions:
  - continue recent pack
  - review due phrases
- Pack learner page now gracefully handles missing audio with an “Audio unavailable” state.
- Admin pack editor polish:
  - visible publish status in pack edit
  - linked phrase scan summary
  - current primary audio + audio version list

## Environment variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# or (new key naming from Supabase dashboard)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=...
```

## Supabase setup checklist

1. Create a Supabase project.
2. Create a **private** storage bucket named `audio`.
3. Run SQL migration:
   - `supabase/migrations/20260403_001_initial_admin_learning.sql`
4. Create your auth user (magic link).
5. Insert a profile row and set admin flag:

```sql
insert into profiles (id, email, is_admin)
values ('<auth_user_id>', '<your_email>', true)
on conflict (id) do update set is_admin = excluded.is_admin;
```

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and `http://localhost:3000/admin`.

## Notes

- Signed URL generation is isolated in `lib/supabase/audioResolver.ts` so audio access logic stays out of UI components.
- Progress writes are encapsulated in `lib/progressRepository.ts` (UI uses `useProgress`).
- Scheduler logic remains isolated in `lib/reviewScheduler.ts`.
- Current merge policy is intentionally simple:
  - authenticated mode prefers server state
  - local fallback is separate
  - no complex conflict resolution yet


## Learner flow polish update (2026-04-04)

A follow-up pass prioritized daily learning ergonomics over admin expansion:
- Home now acts as a true daily entry: **continue recent pack** or **review due phrases** as the two primary actions.
- Pack view now surfaces clearer learning state (`new` / `in progress` / `completed`), includes a lightweight “Done for now” action, and keeps review transition visible.
- Transcript rendering now prefers authored phrase span metadata (`start_char_index` / `end_char_index`) for cleaner phrase noticing when available.
- Review is simplified to a focused, low-friction loop: prompt -> reveal -> easy/close/hard.
- Phrase detail is more compact and action-oriented, with current learner state (saved/review status/due) and quick return paths to pack/review.


## Pack study noticing update (2026-04-04)

A focused iteration improved in-context phrase noticing inside pack study:
- transcript highlighting now supports lightweight state distinctions for neutral/saved/confusing/focused targets.
- learners can focus a phrase in-place and get a compact support panel (meaning, note, save/flag/want actions, detail jump).
- when phrase timing metadata exists, pack study offers phrase-aware listening actions (jump/replay).
- a lightweight study mode toggle helps reduce cognitive load by hiding the full phrase list during focused study.
- behavior gracefully falls back when span/timing metadata is missing.

## Build reliability note (2026-04-04)

- Learner pack page Hook declarations were stabilized so `useEffect` / `useMemo` are always called in consistent render order.
- This resolves `react-hooks/rules-of-hooks` build failures seen during Vercel `npm run build`.

## Supabase-first content delivery update (2026-04-04)

- Learner pack APIs now run in **Supabase-first mode**:
  - `/api/packs`
  - `/api/packs/[id]`
- Local seed-content fallback for these APIs has been removed.
- If Supabase env is missing or the Supabase request fails, these APIs now return explicit `500` errors.
