-- Her Way: community chat (authenticated-only, moderated group room).
-- Additive and safe to run again. No existing table or progress is removed.
create table if not exists public.community_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  sender_name text not null default 'Participante',
  body text not null check (length(btrim(body)) between 1 and 700),
  created_at timestamptz not null default now()
);
create index if not exists community_messages_created_idx on public.community_messages(created_at desc);

create table if not exists public.community_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id,blocked_id),
  constraint block_not_self check (blocker_id <> blocked_id)
);

create table if not exists public.community_reports (
  id bigint generated always as identity primary key,
  message_id bigint not null references public.community_messages(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('assedio','spam','conteudo_inadequado','outro')),
  created_at timestamptz not null default now(),
  unique (message_id,reporter_id)
);
create index if not exists community_reports_created_idx on public.community_reports(created_at desc);

create or replace function public.community_set_message_author()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare display_name text;
begin
  if auth.uid() is null then raise exception 'Você precisa entrar na Her Way para enviar mensagens'; end if;
  new.user_id := auth.uid();
  new.body := btrim(new.body);
  if length(new.body) < 1 or length(new.body) > 700 then raise exception 'A mensagem deve conter entre 1 e 700 caracteres'; end if;
  if new.body ~* '(https?://|www\.)' then raise exception 'Links não são permitidos no bate-papo'; end if;
  if (select count(*) from public.community_messages
      where user_id = auth.uid() and created_at > now() - interval '1 minute') >= 5
  then raise exception 'Limite de 5 mensagens por minuto. Tente novamente em instantes.'; end if;
  select nullif(btrim(split_part(name, E'\n', 1)),'') into display_name
    from public.profiles where id = auth.uid();
  new.sender_name := left(coalesce(display_name,'Participante'),50);
  new.created_at := now();
  return new;
end $$;

drop trigger if exists community_messages_set_author on public.community_messages;
create trigger community_messages_set_author before insert on public.community_messages
for each row execute function public.community_set_message_author();

alter table public.community_messages enable row level security;
alter table public.community_blocks enable row level security;
alter table public.community_reports enable row level security;

drop policy if exists community_messages_read on public.community_messages;
create policy community_messages_read on public.community_messages for select to authenticated
using (
  public.is_admin() or (
    not exists (
      select 1 from public.community_blocks b
      where b.blocker_id = auth.uid() and b.blocked_id = community_messages.user_id
    )
  )
);

drop policy if exists community_messages_post on public.community_messages;
create policy community_messages_post on public.community_messages for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists community_messages_delete on public.community_messages;
create policy community_messages_delete on public.community_messages for delete to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists community_blocks_read on public.community_blocks;
create policy community_blocks_read on public.community_blocks for select to authenticated
using (blocker_id = auth.uid() or public.is_admin());

drop policy if exists community_blocks_insert on public.community_blocks;
create policy community_blocks_insert on public.community_blocks for insert to authenticated
with check (blocker_id = auth.uid());

drop policy if exists community_blocks_delete on public.community_blocks;
create policy community_blocks_delete on public.community_blocks for delete to authenticated
using (blocker_id = auth.uid());

drop policy if exists community_reports_read on public.community_reports;
create policy community_reports_read on public.community_reports for select to authenticated
using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists community_reports_insert on public.community_reports;
create policy community_reports_insert on public.community_reports for insert to authenticated
with check (reporter_id = auth.uid());

-- Disallow user-issued changes to sent messages or reports. Only delete is permitted.
grant select, insert, delete on public.community_messages to authenticated;
grant select, insert, delete on public.community_blocks to authenticated;
grant select, insert on public.community_reports to authenticated;
grant usage, select on sequence public.community_messages_id_seq to authenticated;
grant usage, select on sequence public.community_reports_id_seq to authenticated;

-- Enable Supabase Realtime for INSERT/DELETE without disturbing other publications.
do $$
begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname='supabase_realtime' and schemaname='public' and tablename='community_messages'
     ) then
       alter publication supabase_realtime add table public.community_messages;
  end if;
end $$;
