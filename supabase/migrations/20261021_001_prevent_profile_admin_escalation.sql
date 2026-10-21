-- Restrict profile editing to trusted server-side administrators.
-- The original profiles self-update policy allowed a user to change is_admin.
-- Leave self-service reads intact; privilege assignments use service_role.
drop policy if exists "profiles self update" on public.profiles;

-- Defense in depth: additionally deny all public client UPDATE privileges.
revoke update on table public.profiles from public, anon, authenticated;

-- Keep this check executable during rollout:
-- select policyname, cmd from pg_policies
-- where schemaname = 'public' and tablename = 'profiles';
-- Expected: no UPDATE/ALL policy granting authenticated users updates.
