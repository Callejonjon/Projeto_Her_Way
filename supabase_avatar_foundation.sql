-- HER WAY | ETAPA 1: FUNDAÇÃO DOS AVATARES 2D
-- Execute uma vez no SQL Editor. Migração aditiva: não modifica XP, progresso ou perfil.
-- Peças e categorias representam metadados; artes transparentes serão conectadas na etapa 2.

create table if not exists public.avatar_items (
  id text primary key check (id ~ '^[a-z0-9_]{3,64}$'),
  category text not null check (category in ('hair','outfit','shoes','accessory','pet','drink','device')),
  name text not null check (length(name) between 2 and 80),
  asset_key text not null unique check (asset_key ~ '^[a-z0-9_/-]{3,128}$'),
  unlock_type text not null default 'free'
    check (unlock_type in ('free','xp','profile_photo','course')),
  required_xp integer not null default 0 check (required_xp between 0 and 100000),
  course_id text references public.learning_modules(id) on delete restrict,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint avatar_item_unlock_valid check (
    (unlock_type='xp' and required_xp>0 and course_id is null) or
    (unlock_type='course' and course_id is not null and required_xp=0) or
    (unlock_type in ('free','profile_photo') and course_id is null and required_xp=0)
  )
);
create index if not exists avatar_items_category_idx on public.avatar_items(category,sort_order);

create table if not exists public.user_avatar_inventory (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null references public.avatar_items(id) on delete restrict,
  unlocked_at timestamptz not null default now(),
  primary key(user_id,item_id)
);
create index if not exists avatar_inventory_user_idx on public.user_avatar_inventory(user_id);

create table if not exists public.user_avatar_config (
  user_id uuid primary key references auth.users(id) on delete cascade,
  skin_tone text not null default 'medium'
    check (skin_tone in ('light','warm','medium','tan','deep','dark')),
  hair_id text references public.avatar_items(id) default 'hair_black_long',
  outfit_id text references public.avatar_items(id) default 'outfit_casual',
  shoes_id text references public.avatar_items(id) default 'shoes_sneakers',
  accessory_id text references public.avatar_items(id) default 'accessory_none',
  pet_id text references public.avatar_items(id) default 'pet_none',
  drink_id text references public.avatar_items(id) default 'drink_none',
  device_id text references public.avatar_items(id) default 'device_none',
  updated_at timestamptz not null default now()
);

alter table public.avatar_items enable row level security;
alter table public.user_avatar_inventory enable row level security;
alter table public.user_avatar_config enable row level security;

drop policy if exists avatar_items_read on public.avatar_items;
create policy avatar_items_read on public.avatar_items for select to authenticated
using (active or public.is_admin());

drop policy if exists avatar_inventory_read on public.user_avatar_inventory;
create policy avatar_inventory_read on public.user_avatar_inventory for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists avatar_config_read on public.user_avatar_config;
create policy avatar_config_read on public.user_avatar_config for select to authenticated
using (user_id = (select auth.uid()));

-- Toda concessão/equipagem passa por funções verificadas: cliente não consegue
-- inserir itens, editar requisitos ou dar recompensas para si.
revoke all on public.avatar_items,public.user_avatar_inventory,public.user_avatar_config from anon;
revoke all on public.avatar_items,public.user_avatar_inventory,public.user_avatar_config from authenticated;
grant select on public.avatar_items,public.user_avatar_inventory,public.user_avatar_config to authenticated;

-- Catálogo inicial, com categorias independentes e itens livres/desbloqueáveis.
-- O catálogo não contém imagens ainda; asset_key será resolvido pelo renderer 2D.
insert into public.avatar_items (id,category,name,asset_key,unlock_type,required_xp,sort_order)
values
('hair_black_long','hair','Cabelo preto longo','hair/black_long','free',0,1),
('hair_brown_short','hair','Cabelo castanho curto','hair/brown_short','free',0,2),
('hair_curly','hair','Cachos naturais','hair/curly','free',0,3),
('hair_bun','hair','Coque profissional','hair/bun','xp',150,4),
('hair_pink','hair','Cabelo rosa','hair/pink','xp',350,5),
('outfit_casual','outfit','Casual contemporâneo','outfit/casual','free',0,1),
('outfit_blazer','outfit','Blazer profissional','outfit/blazer','xp',200,2),
('outfit_comfy','outfit','Conforto de estudos','outfit/comfy','free',0,3),
('outfit_premium','outfit','Look de conquista','outfit/premium','xp',650,4),
('shoes_sneakers','shoes','Tênis','shoes/sneakers','free',0,1),
('shoes_formal','shoes','Sapato social','shoes/formal','xp',180,2),
('accessory_none','accessory','Sem acessório','accessory/none','free',0,0),
('accessory_glasses','accessory','Óculos','accessory/glasses','free',0,1),
('accessory_headphones','accessory','Fone de ouvido','accessory/headphones','xp',100,2),
('accessory_star','accessory','Estrela de conquista','accessory/star','profile_photo',0,3),
('pet_none','pet','Sem pet','pet/none','free',0,0),
('pet_cat','pet','Gatinho companheiro','pet/cat','xp',350,1),
('pet_dog','pet','Cachorrinho companheiro','pet/dog','xp',500,2),
('drink_none','drink','Sem bebida','drink/none','free',0,0),
('drink_coffee','drink','Café quentinho','drink/coffee','xp',120,1),
('drink_matcha','drink','Matcha','drink/matcha','xp',260,2),
('device_none','device','Sem dispositivo','device/none','free',0,0),
('device_laptop','device','Notebook','device/laptop','xp',300,1)
on conflict(id) do nothing;

create or replace function public.avatar_claim_item(p_item text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_item public.avatar_items%rowtype;
  v_xp integer;
begin
  if v_uid is null then raise exception 'Faça login para desbloquear itens'; end if;
  select * into v_item from public.avatar_items where id=p_item and active;
  if not found then raise exception 'Item indisponível'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text,2026));
  if exists(select 1 from public.user_avatar_inventory
            where user_id=v_uid and item_id=p_item) then return false; end if;

  if v_item.unlock_type='xp' then
    select coalesce(xp,0) into v_xp from public.profiles where id=v_uid;
    if coalesce(v_xp,0)<v_item.required_xp then
      raise exception 'Você ainda não alcançou o XP necessário'; end if;
  elsif v_item.unlock_type='profile_photo' then
    if not exists(select 1 from public.profile_achievements
                  where user_id=v_uid and achievement='profile_photo') then
      raise exception 'Adicione sua primeira foto de perfil para desbloquear'; end if;
  elsif v_item.unlock_type='course' then
    if not exists(select 1 from public.modules_progress
        where user_id=v_uid and module_id=v_item.course_id
          and completed_at is not null and quiz_score>=70) then
      raise exception 'Conclua o curso necessário para desbloquear'; end if;
  end if;

  insert into public.user_avatar_inventory(user_id,item_id) values(v_uid,p_item);
  return true;
end $$;
revoke all on function public.avatar_claim_item(text) from public,anon,authenticated;
grant execute on function public.avatar_claim_item(text) to authenticated;

create or replace function public.avatar_save_look(p_style jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_uid uuid:=auth.uid();
  v_style jsonb;
  v_entry record;
  v_item public.avatar_items%rowtype;
  v_column text;
  v_value text;
begin
  if v_uid is null then raise exception 'Faça login para personalizar seu avatar'; end if;
  if jsonb_typeof(p_style)<>'object' then raise exception 'Configuração inválida'; end if;
  if exists(select 1 from jsonb_object_keys(p_style) k
    where k not in ('skin_tone','hair_id','outfit_id','shoes_id','accessory_id','pet_id','drink_id','device_id'))
  then raise exception 'Campo de configuração inválido'; end if;
  if p_style ? 'skin_tone' and (p_style->>'skin_tone') not in
    ('light','warm','medium','tan','deep','dark') then
    raise exception 'Tom de pele inválido'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_uid::text,2026));
  -- Não é permitido equipar peça desativada ou não desbloqueada.
  for v_entry in select * from (values
    ('hair_id','hair'),('outfit_id','outfit'),('shoes_id','shoes'),
    ('accessory_id','accessory'),('pet_id','pet'),('drink_id','drink'),('device_id','device')
  ) as pairs(field_name,category_name)
  loop
    if p_style ? v_entry.field_name then
      v_value:=p_style->>v_entry.field_name;
      if v_value is null or v_value='' then raise exception 'Escolha uma peça válida'; end if;
      select * into v_item from public.avatar_items where id=v_value
        and category=v_entry.category_name and active;
      if not found then raise exception 'Peça de categoria incorreta ou indisponível'; end if;
      if not exists(select 1 from public.user_avatar_inventory
                    where user_id=v_uid and item_id=v_value) then
        raise exception 'Desbloqueie a peça antes de equipá-la'; end if;
    end if;
  end loop;

  insert into public.user_avatar_config (user_id) values (v_uid)
  on conflict(user_id) do nothing;
  update public.user_avatar_config set
    skin_tone=coalesce(p_style->>'skin_tone',skin_tone),
    hair_id=coalesce(p_style->>'hair_id',hair_id),
    outfit_id=coalesce(p_style->>'outfit_id',outfit_id),
    shoes_id=coalesce(p_style->>'shoes_id',shoes_id),
    accessory_id=coalesce(p_style->>'accessory_id',accessory_id),
    pet_id=coalesce(p_style->>'pet_id',pet_id),
    drink_id=coalesce(p_style->>'drink_id',drink_id),
    device_id=coalesce(p_style->>'device_id',device_id),
    updated_at=now()
  where user_id=v_uid;
end $$;
revoke all on function public.avatar_save_look(jsonb) from public,anon,authenticated;
grant execute on function public.avatar_save_look(jsonb) to authenticated;
