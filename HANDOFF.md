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

## Latest hotfix session update (2026-04-03)

### Goal
Resolve Vercel production build failure caused by blocked vulnerable Next.js version detection (CVE-2025-66478).

### Changes made

1. Updated dependency constraints in `package.json`:
   - `next`: `15.2.5` -> `^15.2.10`
   - `eslint-config-next`: `15.2.5` -> `^15.2.10`
2. Added a README security note documenting why ranges are used (to avoid vulnerable hard pinning).

### Follow-up recommendation

- In a network-enabled dev environment, run `npm install` and commit the refreshed `package-lock.json` to keep local/CI resolution deterministic.

## Clarification update (2026-04-03)

### Question addressed
- "Do we need Supabase integration before uploading audio files?"

### Answer captured
- Not strictly required for early UI checks because learner routes keep local/seed fallback behavior.
- Required once admin authoring/persistence begins (`/admin`, Auth, DB content).
- Storage setup is only required when audio upload/management starts.

### Docs change
- Added a dedicated README section explaining the phased Supabase adoption path (UI only -> DB/Auth -> Storage/audio).



## Minimalist UI refresh session update (2026-04-03)

### Goal
Shift learner-facing UI from card-based visual patterns to a refined minimal style centered on typography, spacing, separators, and icon-led actions.

### What changed
1. Reworked core learner pages (`/`, `/library`, `/pack/[id]`, `/phrase/[id]`, `/review`, `/settings`) to remove heavy card emphasis and use section dividers and cleaner hierarchy.
2. Added reusable icon system (`components/ui/Icon.tsx`) and replaced many text labels with icons for navigation and frequent actions.
3. Replaced text tab bar with icon-first bottom navigation (`components/ui/BottomNav.tsx`) including active route state.
4. Updated global styles to support minimalist primitives (`section`, `field`, refined button styles) while preserving compatibility classes used in untouched admin flows.

### Follow-up recommendations
- Add tooltips for icon-only controls on desktop hover for improved discoverability.
- Validate color contrast and tap target sizes with accessibility checks before production release.
- Consider a design token pass (type scale, spacing scale) for stricter visual consistency as features expand.


## Consistency hardening session update (2026-04-03)

### Goal
Align implemented behavior with the documented architecture by tightening read access, strengthening learner APIs, and making repeat authoring practical without adding broad new features.

### What was fixed
1. **RLS content read tightening**
   - Updated migration policies so learner reads are scoped to published content only (packs, phrases, pack_phrases, audio_assets), while admins keep full read/write on content tables.
   - Preserved user-owned progress table policies and admin-only content writes.

2. **Learner API parity with DB-authored content**
   - `GET /api/packs` now derives `phraseIds` (sorted), `tags`, primary pack audio URL, and duration from DB rows where available.
   - `GET /api/packs/[id]` now enforces published read, keeps phrase order from `pack_phrases.sort_order`, preserves authored phrase arrays, and returns link metadata (`sort_order`, `role`, indices, timing).
   - Seed fallback remains when Supabase env/config is unavailable or a request fails.

3. **PackEditor authoring flow improvements**
   - Added existing phrase search/link flow (slug/text search) to avoid new-row-only authoring.
   - Added linked phrase visibility with editable link metadata (`sort_order`, `role`, char/sec ranges).
   - Added unlink action that removes only `pack_phrases` rows (not phrase records).

4. **Audio versioning for repeated uploads**
   - Replaced fixed `v1.mp3` behavior with version increments (`vN.ext`).
   - New uploads are marked primary; previous primary assets are unset but retained for history.

5. **Route guard cleanup**
   - Added a light server-side admin guard helper and applied it to `/admin/packs/new` and `/admin/packs/[id]/edit` routes (redirect to `/admin` when not admin).

### What remains intentionally postponed
- Full signed-URL delivery flow for private Storage bucket playback (currently API resolves primary storage path as public-object URL shape).
- Rich phrase clip workflow (`kind = phrase_clip`) and advanced content QA tools.
- Multi-admin governance / invitation management.

### Next logical step
Implement a dedicated server endpoint for signed pack audio URLs (using service role only on server), then switch learner pack APIs to return those signed URLs so private bucket playback is production-safe end-to-end.
