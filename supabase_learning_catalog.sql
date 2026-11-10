-- Her Way: catalog of real educational content (run once in Supabase SQL Editor)
-- Does not remove or alter existing profile/progress tables.
create table if not exists public.learning_modules (
  id text primary key,
  title text not null,
  track text not null check (track in ('A','B','all')),
  stage integer not null check (stage in (2,4,5)),
  sort_order integer not null default 0,
  duration_min integer not null default 30,
  skills_granted text[] not null default '{}',
  slides jsonb not null default '[]'::jsonb,
  quiz jsonb not null default '[]'::jsonb,
  source_filename text,
  quiz_filename text,
  review_required boolean not null default false,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists learning_modules_track_order_idx
  on public.learning_modules (track, stage, sort_order);

alter table public.learning_modules enable row level security;

drop policy if exists "learning_modules_read" on public.learning_modules;
create policy "learning_modules_read" on public.learning_modules for select
to authenticated using (published or public.is_admin());

drop policy if exists "learning_modules_insert_admin" on public.learning_modules;
create policy "learning_modules_insert_admin" on public.learning_modules for insert
to authenticated with check (public.is_admin());

drop policy if exists "learning_modules_update_admin" on public.learning_modules;
create policy "learning_modules_update_admin" on public.learning_modules for update
to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "learning_modules_delete_admin" on public.learning_modules;
create policy "learning_modules_delete_admin" on public.learning_modules for delete
to authenticated using (public.is_admin());

-- Do not enable publishing until the quiz answers and time-sensitive texts have been reviewed.
