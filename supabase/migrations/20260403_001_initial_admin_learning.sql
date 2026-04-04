create extension if not exists pgcrypto;

create table if not exists packs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  level text,
  topic text,
  transcript text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  estimated_duration_sec integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists phrases (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  text text not null,
  core_pattern text,
  meaning_ja text not null,
  meaning_en text,
  notes text,
  difficulty integer,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pack_phrases (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references packs(id) on delete cascade,
  phrase_id uuid not null references phrases(id) on delete cascade,
  sort_order integer not null default 0,
  start_char_index integer,
  end_char_index integer,
  start_sec numeric,
  end_sec numeric,
  role text not null default 'main' check (role in ('main', 'support')),
  created_at timestamptz not null default now(),
  unique(pack_id, phrase_id)
);

create table if not exists audio_assets (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid references packs(id) on delete cascade,
  phrase_id uuid references phrases(id) on delete cascade,
  kind text not null check (kind in ('pack_full', 'phrase_clip')),
  storage_path text not null,
  mime_type text,
  duration_sec numeric,
  version integer not null default 1,
  is_primary boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_phrase_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phrase_id uuid not null references phrases(id) on delete cascade,
  state text not null default 'new' check (state in ('new', 'learning', 'review', 'mastered')),
  last_reviewed_at timestamptz,
  due_at timestamptz,
  stability_score numeric not null default 0,
  easy_count integer not null default 0,
  close_count integer not null default 0,
  hard_count integer not null default 0,
  favorite boolean not null default false,
  confusing boolean not null default false,
  want_to_use boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, phrase_id)
);

create table if not exists user_pack_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pack_id uuid not null references packs(id) on delete cascade,
  started_at timestamptz,
  completed_at timestamptz,
  last_opened_at timestamptz,
  saved_phrase_count integer not null default 0,
  status text not null default 'new' check (status in ('new', 'in_progress', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, pack_id)
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists packs_set_updated_at on packs;
create trigger packs_set_updated_at before update on packs for each row execute function set_updated_at();

drop trigger if exists phrases_set_updated_at on phrases;
create trigger phrases_set_updated_at before update on phrases for each row execute function set_updated_at();

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at before update on profiles for each row execute function set_updated_at();

drop trigger if exists user_phrase_progress_set_updated_at on user_phrase_progress;
create trigger user_phrase_progress_set_updated_at before update on user_phrase_progress for each row execute function set_updated_at();

drop trigger if exists user_pack_progress_set_updated_at on user_pack_progress;
create trigger user_pack_progress_set_updated_at before update on user_pack_progress for each row execute function set_updated_at();

alter table packs enable row level security;
alter table phrases enable row level security;
alter table pack_phrases enable row level security;
alter table audio_assets enable row level security;
alter table profiles enable row level security;
alter table user_phrase_progress enable row level security;
alter table user_pack_progress enable row level security;

create or replace function is_admin_user()
returns boolean
language sql
stable
as $$
  select exists(
    select 1 from profiles p
    where p.id = auth.uid() and p.is_admin = true
  );
$$;

drop policy if exists "published packs read" on packs;
create policy "published packs read"
on packs
for select
using (status = 'published' or is_admin_user());

drop policy if exists "packs admin write" on packs;
create policy "packs admin write"
on packs
for all
using (is_admin_user())
with check (is_admin_user());

drop policy if exists "phrases read" on phrases;
create policy "phrases read"
on phrases
for select
using (
  is_admin_user()
  or exists (
    select 1
    from pack_phrases pp
    join packs pk on pk.id = pp.pack_id
    where pp.phrase_id = phrases.id
      and pk.status = 'published'
  )
);

drop policy if exists "phrases admin write" on phrases;
create policy "phrases admin write"
on phrases
for all
using (is_admin_user())
with check (is_admin_user());

drop policy if exists "pack_phrases read" on pack_phrases;
create policy "pack_phrases read"
on pack_phrases
for select
using (
  is_admin_user()
  or exists (
    select 1 from packs pk
    where pk.id = pack_phrases.pack_id
      and pk.status = 'published'
  )
);

drop policy if exists "pack_phrases admin write" on pack_phrases;
create policy "pack_phrases admin write"
on pack_phrases
for all
using (is_admin_user())
with check (is_admin_user());

drop policy if exists "audio_assets read" on audio_assets;
create policy "audio_assets read"
on audio_assets
for select
using (
  is_admin_user()
  or (
    audio_assets.pack_id is not null
    and exists (
      select 1 from packs pk
      where pk.id = audio_assets.pack_id
        and pk.status = 'published'
    )
  )
);

drop policy if exists "audio_assets admin write" on audio_assets;
create policy "audio_assets admin write"
on audio_assets
for all
using (is_admin_user())
with check (is_admin_user());

drop policy if exists "profiles self read" on profiles;
create policy "profiles self read"
on profiles
for select
using (id = auth.uid() or is_admin_user());

drop policy if exists "profiles self update" on profiles;
create policy "profiles self update"
on profiles
for update
using (id = auth.uid() or is_admin_user())
with check (id = auth.uid() or is_admin_user());

drop policy if exists "phrase progress own" on user_phrase_progress;
create policy "phrase progress own"
on user_phrase_progress
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "pack progress own" on user_pack_progress;
create policy "pack progress own"
on user_pack_progress
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
