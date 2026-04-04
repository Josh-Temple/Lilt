# Lilt

Lilt is an **input-first English phrase learning app** with a private authoring console.

## Current architecture (MVP+Supabase foundation)

Lilt now uses a two-layer model from day one:
- **Shared content layer**: packs, phrases, links, and audio metadata.
- **Per-user progress layer**: phrase and pack progress separated by `user_id`.

This keeps the app light for a solo creator now while remaining ready for future multi-user release.

## Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Supabase Auth (magic link), Postgres (content + progress), Storage (audio bucket)
- Local progress store still exists as fallback while DB progress integration is phased in

## Implemented in this iteration

- Added Supabase schema migration for the minimum table set:
  - `packs`
  - `phrases`
  - `pack_phrases`
  - `audio_assets`
  - `user_phrase_progress`
  - `user_pack_progress`
  - `profiles`
- Added baseline RLS policies:
  - admin-only writes for content tables
  - user-owned access for progress tables
- Added private admin routes:
  - `/admin`
  - `/admin/packs/new`
  - `/admin/packs/[id]/edit`
- Refactored Supabase access into a shared HTTP utility (`lib/supabase/http.ts`) to remove duplicated request/header logic and improve maintainability.
- Refactored admin editor state/actions to reduce duplication and centralize async error handling.
- Added simple admin actions:
  - magic-link sign-in request
  - create/update pack
  - add phrase + pack link
  - upload pack audio

- Pack authoring now supports linking existing phrases, editing/unlinking existing `pack_phrases` metadata, and pack audio versioning (`vN`) with newest asset promoted to primary.
- Added API routes so learning pages can read packs from Supabase (published) with local seed fallback:
  - `GET /api/packs`
  - `GET /api/packs/[id]`

## Is Supabase required before uploading audio?

Short answer: **No** for basic learning UI checks, **Yes** for admin/content persistence.

- You can run and validate learner-facing screens with local/seed fallback even when Supabase env vars are unset.
- You need Supabase when you want to:
  - use `/admin` flows (magic-link auth + authoring)
  - persist packs/phrases in DB
  - upload/manage audio assets in Storage

Recommended phased approach:
1. UI prototyping: run without Supabase.
2. Content authoring start: enable Supabase DB/Auth.
3. Audio operations: configure Storage bucket and upload flow.

## Environment variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Supabase setup checklist

1. Create a Supabase project.
2. Create a private storage bucket named `audio`.
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

## Dependency security note

- Next.js and `eslint-config-next` are version-ranged from `^15.2.10` to ensure Vercel installs a CVE-patched 15.x release instead of the vulnerable `15.2.5` pin.


## Access model update (2026-04-03 migration note)

The initial RLS baseline was tightened so learner reads now align with the intended architecture:
- **Packs**: learners can read only `published`; admins can read all statuses.
- **Phrases / pack links**: learners can read only rows connected to published packs; admins can read all.
- **Audio assets**: learners can read only assets linked to published packs; admins can read all.
- **Content writes**: still admin-only.
- **Per-user progress**: still row-owner only.

This removes broad `auth.uid() is not null` read access from content tables and keeps learner access strictly published-content scoped.

## Notes

- Learning/review UI still supports local fallback behavior while DB-backed progress is phased in.
- Audio URLs are stored as `storage_path` in `audio_assets`; learner APIs resolve the current primary asset for each pack.

- DB-backed `/api/packs` and `/api/packs/[id]` now return real linked phrase IDs, tags, and primary pack audio URL from `audio_assets` instead of empty placeholders.
- Pack detail API preserves authored phrase fields (including variants/contrasts/examples when present) and returns phrase order from `pack_phrases.sort_order` with link metadata for highlighting.
- Seed JSON fallback behavior remains unchanged when Supabase is unavailable.
- Scheduler logic remains isolated in `lib/reviewScheduler.ts`.


## UI design refresh (2026-04-03)

- Reworked learner-facing pages from card-heavy blocks to a minimalist typography-first layout with whitespace and divider lines.
- Introduced lightweight line icons for navigation, actions, and status toggles to reduce text-heavy controls.
- Added a persistent icon-only bottom navigation with active state.
