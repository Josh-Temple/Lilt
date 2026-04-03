# Handoff Notes

## Latest session update (2026-04-03)

### Goal
Implement the minimum Supabase-ready architecture and private admin workflow for content authoring.

### What was added

1. **Supabase data model + security (SQL migration)**
   - Added `supabase/migrations/20260403_001_initial_admin_learning.sql`.
   - Includes tables for shared content (`packs`, `phrases`, `pack_phrases`, `audio_assets`), per-user progress (`user_phrase_progress`, `user_pack_progress`), and admin profile (`profiles`).
   - Includes `updated_at` triggers and RLS policies:
     - content write = admin only
     - progress read/write = row owner only

2. **Supabase client utilities**
   - Added browser/server Supabase client helpers:
     - `lib/supabase/client.ts`
     - `lib/supabase/server.ts`
   - Refactored shared request/env/token handling into `lib/supabase/http.ts` to reduce duplicated networking code.

3. **Admin UI (creator-only lightweight console)**
   - Added routes:
     - `/admin`
     - `/admin/packs/new`
     - `/admin/packs/[id]/edit`
   - Added reusable admin components:
     - `components/admin/AdminShell.tsx`
     - `components/admin/PackEditor.tsx`
   - Features currently in UI:
     - request magic link
     - create/update pack metadata + publish status
     - add phrase and pack link (sort/role/index/time fields)
     - upload pack-full audio and insert `audio_assets` row

4. **Learning-side DB read bridge (with fallback)**
   - Added API routes:
     - `app/api/packs/route.ts`
     - `app/api/packs/[id]/route.ts`
   - Updated client hooks/pages to consume API-backed packs:
     - `lib/usePacks.ts`
     - `app/library/page.tsx`
     - `app/pack/[id]/page.tsx`
   - Current behavior:
     - If Supabase env/config unavailable, seed JSON fallback still works.

5. **Project/docs updates**
   - Rewrote `README.md` for the new architecture, setup, and migration workflow.
   - Replaced the legacy ESLint flat-config file with `.eslintrc.json` for compatibility with `next lint`.

### Open items / recommended next steps

1. **Server-side admin guard**
   - Current admin validation is primarily client-driven (`profiles.is_admin` check in UI).
   - Add strict server-side middleware/route protection before production.

2. **Storage signed URL flow**
   - Learning pages currently keep audio handling minimal.
   - Add server endpoint to generate signed URLs from `audio_assets.storage_path`.

3. **Progress migration from local to DB**
   - The review flow still uses localStorage-centric progress code.
   - Add DB-backed `user_phrase_progress` and `user_pack_progress` writes/reads.

4. **Phrase reuse UX**
   - Current editor always creates a new phrase row.
   - Add “link existing phrase” support and dedupe guards.

5. **Validation + polish**
   - Add schema-level input validation (zod or similar) for admin forms.
   - Improve admin feedback and list linked phrases/audio in edit page.
   - Consider adding server-side guards for admin routes (current flow is still client-led).

### Environment caveat

Validation was run in this environment with `npm run lint`, `npm run typecheck`, and `npm run build`.
