-- Her Way · Materiais originais e aulas com avatar (Etapa 1).
-- Execute no SQL Editor DEPOIS de supabase_learning_catalog.sql.
-- Migração não destrutiva: preserva cursos, quizzes, perfis e progresso existentes.

alter table public.learning_modules
  add column if not exists video_script text,
  add column if not exists video_transcript text,
  add column if not exists video_summary text,
  add column if not exists video_status text not null default 'not_started'
    check (video_status in ('not_started','script_ready','generating','ready','failed'));

create table if not exists public.learning_assets (
  id uuid primary key default gen_random_uuid(),
  module_id text not null references public.learning_modules(id) on delete cascade,
  asset_kind text not null check (asset_kind in ('pdf','pptx','quiz_pdf','avatar_video')),
  original_filename text not null,
  storage_path text,
  external_url text,
  content_type text,
  created_at timestamptz not null default now(),
  unique (module_id,asset_kind),
  constraint asset_exactly_one_location check (
    (storage_path is not null and external_url is null) or
    (storage_path is null and external_url is not null)
  ),
  constraint video_external_https check (
    external_url is null or
    (asset_kind = 'avatar_video' and external_url ~ '^https://')
  ),
  constraint storage_prefix check (
    storage_path is null or storage_path like module_id || '/%'
  )
);
create index if not exists learning_assets_module_idx on public.learning_assets(module_id);

alter table public.learning_assets enable row level security;

drop policy if exists learning_assets_read on public.learning_assets;
create policy learning_assets_read on public.learning_assets for select to authenticated
using (
  public.is_admin() or exists (
    select 1 from public.learning_modules m
    where m.id = module_id and m.published
  )
);

drop policy if exists learning_assets_insert on public.learning_assets;
create policy learning_assets_insert on public.learning_assets for insert
to authenticated with check (public.is_admin());

drop policy if exists learning_assets_update on public.learning_assets;
create policy learning_assets_update on public.learning_assets for update
to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists learning_assets_delete on public.learning_assets;
create policy learning_assets_delete on public.learning_assets for delete
to authenticated using (public.is_admin());

-- Bucket privado: arquivos acessíveis apenas mediante políticas e URLs assinadas.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'learning-materials','learning-materials',false,52428800,
  array['application/pdf','application/vnd.openxmlformats-officedocument.presentationml.presentation','video/mp4']
)
on conflict (id) do nothing;

drop policy if exists learning_materials_admin_insert on storage.objects;
create policy learning_materials_admin_insert on storage.objects for insert to authenticated
with check (bucket_id = 'learning-materials' and public.is_admin());

drop policy if exists learning_materials_admin_update on storage.objects;
create policy learning_materials_admin_update on storage.objects for update to authenticated
using (bucket_id = 'learning-materials' and public.is_admin())
with check (bucket_id = 'learning-materials' and public.is_admin());

drop policy if exists learning_materials_admin_delete on storage.objects;
create policy learning_materials_admin_delete on storage.objects for delete to authenticated
using (bucket_id = 'learning-materials' and public.is_admin());

drop policy if exists learning_materials_authenticated_read on storage.objects;
create policy learning_materials_authenticated_read on storage.objects for select to authenticated
using (
 bucket_id = 'learning-materials' and (
  public.is_admin() or exists (
   select 1 from public.learning_assets a
   join public.learning_modules m on m.id = a.module_id
   where a.storage_path = name and m.published
  )
 )
);

-- Observação: a publicação de vídeos continua condicionada ao módulo publicado;
-- o vídeo deve ser gerado e revisado pela equipe antes de ser cadastrado.
