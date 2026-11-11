-- Her Way / Pixel Club: sprites reais, ajustáveis por coordenadas.
-- A migração é aditiva. O editor antigo só será substituído após validação visual.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('avatar-assets','avatar-assets',true,4194304,ARRAY['image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=4194304,
allowed_mime_types=ARRAY['image/png','image/webp'];
drop policy if exists avatar_assets_admin_upload on storage.objects;
create policy avatar_assets_admin_upload on storage.objects for insert to authenticated
with check (bucket_id='avatar-assets' and public.is_admin());
drop policy if exists avatar_assets_admin_update on storage.objects;
create policy avatar_assets_admin_update on storage.objects for update to authenticated
using (bucket_id='avatar-assets' and public.is_admin())
with check (bucket_id='avatar-assets' and public.is_admin());
drop policy if exists avatar_assets_admin_delete on storage.objects;
create policy avatar_assets_admin_delete on storage.objects for delete to authenticated
using (bucket_id='avatar-assets' and public.is_admin());

create table if not exists public.avatar_visual_assets (
  id text primary key check(id ~ '^[a-z0-9_]{3,70}$'),
  kind text not null check(kind in
    ('base','hair','outfit','shoes','accessory','pet','drink','device','scene','furniture')),
  item_id text references public.avatar_items(id) on delete set null,
  label text not null check(length(label) between 2 and 100),
  storage_path text not null,
  pos_x integer not null default 0 check(pos_x between -300 and 1300),
  pos_y integer not null default 0 check(pos_y between -300 and 1300),
  width_px integer not null default 500 check(width_px between 1 and 1600),
  height_px integer not null default 500 check(height_px between 1 and 1600),
  z_index integer not null default 10 check(z_index between -100 and 100),
  active boolean not null default false,
  updated_at timestamptz not null default now(),
  unique(storage_path)
);
create index if not exists avatar_visual_assets_kind_idx on public.avatar_visual_assets(kind,active);
alter table public.avatar_visual_assets enable row level security;
drop policy if exists avatar_visual_assets_read on public.avatar_visual_assets;
create policy avatar_visual_assets_read on public.avatar_visual_assets for select to authenticated
using(active or public.is_admin());
drop policy if exists avatar_visual_assets_admin_insert on public.avatar_visual_assets;
create policy avatar_visual_assets_admin_insert on public.avatar_visual_assets for insert to authenticated
with check(public.is_admin());
drop policy if exists avatar_visual_assets_admin_update on public.avatar_visual_assets;
create policy avatar_visual_assets_admin_update on public.avatar_visual_assets for update to authenticated
using(public.is_admin()) with check(public.is_admin());
drop policy if exists avatar_visual_assets_admin_delete on public.avatar_visual_assets;
create policy avatar_visual_assets_admin_delete on public.avatar_visual_assets for delete to authenticated
using(public.is_admin());
grant select,insert,update,delete on public.avatar_visual_assets to authenticated;

-- Visuais de cenário podem ser configurados separadamente da bonequinha.
create table if not exists public.user_avatar_scene (
 user_id uuid primary key references auth.users(id) on delete cascade,
 asset_id text not null references public.avatar_visual_assets(id) on delete restrict,
 updated_at timestamptz not null default now()
);
alter table public.user_avatar_scene enable row level security;
drop policy if exists user_avatar_scene_read on public.user_avatar_scene;
create policy user_avatar_scene_read on public.user_avatar_scene for select to authenticated
using(user_id=(select auth.uid()));
revoke all on public.user_avatar_scene from anon,authenticated;
grant select on public.user_avatar_scene to authenticated;

create or replace function public.avatar_select_scene(p_asset_id text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'Faça login'; end if;
 if not exists(select 1 from public.avatar_visual_assets
   where id=p_asset_id and kind='scene' and active) then
   raise exception 'Cenário indisponível'; end if;
 insert into public.user_avatar_scene(user_id,asset_id,updated_at)
 values(auth.uid(),p_asset_id,now())
 on conflict(user_id) do update set asset_id=excluded.asset_id,updated_at=now();
end $$;
revoke all on function public.avatar_select_scene(text) from public,anon,authenticated;
grant execute on function public.avatar_select_scene(text) to authenticated;
