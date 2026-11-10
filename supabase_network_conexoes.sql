-- Her Way / Conexões — 1:1 e grupos privados (sem sala pública)
create table if not exists public.network_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(display_name) between 2 and 55),
  headline text not null default '' check(length(headline)<=100),
  discoverable boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists public.network_conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check(kind in ('direct','group')),
  title text not null default '' check(length(title)<=70),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists public.network_participants (
  conversation_id uuid not null references public.network_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check(status in ('invited','accepted','declined')),
  joined_at timestamptz not null default now(),
  primary key(conversation_id,user_id)
);
create index if not exists network_participants_user_idx on public.network_participants(user_id,status);
create table if not exists public.network_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.network_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check(length(btrim(body)) between 1 and 700),
  created_at timestamptz not null default now()
);
create index if not exists network_messages_conv_idx on public.network_messages(conversation_id,created_at desc);
create table if not exists public.network_reports (
  id bigint generated always as identity primary key,
  message_id bigint not null references public.network_messages(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check(reason in ('assedio','spam','conteudo_inadequado','outro')),
  created_at timestamptz not null default now(),
  unique(message_id,reporter_id)
);
create or replace function public.network_is_participant(cid uuid, accepted_only boolean default false)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.network_participants p
 where p.conversation_id=cid and p.user_id=auth.uid()
 and (not accepted_only or p.status='accepted'))
$$;
revoke all on function public.network_is_participant(uuid,boolean) from public;
grant execute on function public.network_is_participant(uuid,boolean) to authenticated;

alter table public.network_profiles enable row level security;
alter table public.network_conversations enable row level security;
alter table public.network_participants enable row level security;
alter table public.network_messages enable row level security;
alter table public.network_reports enable row level security;

drop policy if exists network_profiles_read on public.network_profiles;
create policy network_profiles_read on public.network_profiles for select to authenticated
 using (discoverable or user_id=auth.uid());
drop policy if exists network_profiles_write on public.network_profiles;
create policy network_profiles_write on public.network_profiles for insert to authenticated with check(user_id=auth.uid());
drop policy if exists network_profiles_update on public.network_profiles;
create policy network_profiles_update on public.network_profiles for update to authenticated
 using(user_id=auth.uid()) with check(user_id=auth.uid());

drop policy if exists network_conversations_read on public.network_conversations;
create policy network_conversations_read on public.network_conversations for select to authenticated
 using(public.network_is_participant(id));
drop policy if exists network_participants_read on public.network_participants;
create policy network_participants_read on public.network_participants for select to authenticated
 using(public.network_is_participant(conversation_id));
drop policy if exists network_participants_accept on public.network_participants;
create policy network_participants_accept on public.network_participants for update to authenticated
 using(user_id=auth.uid() and status='invited')
 with check(user_id=auth.uid() and status in ('accepted','declined'));
drop policy if exists network_messages_read on public.network_messages;
create policy network_messages_read on public.network_messages for select to authenticated
 using(public.network_is_participant(conversation_id,true) and not exists (
  select 1 from public.community_blocks b
  where b.blocker_id=auth.uid() and b.blocked_id=network_messages.user_id
 ));
drop policy if exists network_messages_send on public.network_messages;
create policy network_messages_send on public.network_messages for insert to authenticated
 with check(user_id=auth.uid() and public.network_is_participant(conversation_id,true));
drop policy if exists network_messages_delete on public.network_messages;
create policy network_messages_delete on public.network_messages for delete to authenticated
 using(user_id=auth.uid());
drop policy if exists network_reports_insert on public.network_reports;
create policy network_reports_insert on public.network_reports for insert to authenticated
 with check(reporter_id=auth.uid() and exists (
  select 1 from public.network_messages m
  where m.id=message_id and public.network_is_participant(m.conversation_id,true)
 ));
drop policy if exists network_reports_read on public.network_reports;
create policy network_reports_read on public.network_reports for select to authenticated
 using(reporter_id=auth.uid() or public.is_admin());

create or replace function public.network_new_conversation(targets uuid[], group_title text default '')
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid(); target uuid; n int; strict_n int; cid uuid; title text:=btrim(coalesce(group_title,''));
begin
 if actor is null then raise exception 'Entre na Her Way'; end if;
 select count(distinct x),count(*) into n,strict_n from unnest(targets) x;
 -- distinct targets, never self and max 8 invites
 if n<1 or n>8 or n<>strict_n or actor=any(targets) then raise exception 'Selecione de 1 a 8 participantes diferentes'; end if;
 if not exists(select 1 from public.network_profiles where user_id=actor and discoverable) then
    raise exception 'Ative sua visibilidade em Conexões para enviar convites';
 end if;
 if title<>'' and (length(title)<3 or length(title)>70) then raise exception 'Nome do grupo deve ter 3 a 70 caracteres'; end if;
 if n>1 and title='' then raise exception 'Informe o nome do grupo'; end if;
 if (select count(*) from public.network_conversations where created_by=actor and created_at>now()-interval '1 hour') >= 5
 then raise exception 'Limite de convites atingido. Tente novamente mais tarde'; end if;
 foreach target in array targets loop
   if not exists(select 1 from public.network_profiles where user_id=target and discoverable) then
      raise exception 'Uma participante não está disponível no diretório';
   end if;
   if exists(select 1 from public.community_blocks
      where (blocker_id=actor and blocked_id=target) or (blocker_id=target and blocked_id=actor))
   then raise exception 'Não é possível enviar convite para uma das participantes'; end if;
 end loop;
 -- reuse an existing 1:1 conversation, even pending, rather than spamming invitations.
 if n=1 then
   select c.id into cid from public.network_conversations c
   where c.kind='direct' and exists(
     select 1 from public.network_participants p where p.conversation_id=c.id and p.user_id=actor
   ) and exists(
     select 1 from public.network_participants p where p.conversation_id=c.id and p.user_id=targets[1]
   ) and (select count(*) from public.network_participants p where p.conversation_id=c.id)=2
   order by c.created_at desc limit 1;
   if cid is not null then return cid; end if;
 end if;
 insert into public.network_conversations(kind,title,created_by)
 values(case when n=1 then 'direct' else 'group' end,title,actor) returning id into cid;
 insert into public.network_participants(conversation_id,user_id,status) values(cid,actor,'accepted');
 foreach target in array targets loop
   insert into public.network_participants(conversation_id,user_id,status) values(cid,target,'invited');
 end loop;
 return cid;
end $$;
revoke all on function public.network_new_conversation(uuid[],text) from public;
grant execute on function public.network_new_conversation(uuid[],text) to authenticated;

create or replace function public.network_message_guard()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare recipient uuid; kind text;
begin
 new.user_id:=auth.uid(); new.body:=btrim(new.body); new.created_at:=now();
 if new.user_id is null or not public.network_is_participant(new.conversation_id,true) then raise exception 'Convite precisa ser aceito'; end if;
 if length(new.body) not between 1 and 700 or new.body~*'(https?://|www\.)' then
   raise exception 'Mensagem inválida (máximo 700 caracteres, sem links)';
 end if;
 if (select count(*) from public.network_messages where user_id=auth.uid()
    and created_at>now()-interval '1 minute')>=5 then raise exception 'Aguarde antes de enviar mais mensagens'; end if;
 select c.kind into kind from public.network_conversations c where c.id=new.conversation_id;
 if kind='direct' then
   select user_id into recipient from public.network_participants
   where conversation_id=new.conversation_id and user_id<>auth.uid() and status='accepted';
   if recipient is null then raise exception 'A outra participante ainda não aceitou'; end if;
   if exists(select 1 from public.community_blocks b where
      (b.blocker_id=new.user_id and b.blocked_id=recipient) or
      (b.blocker_id=recipient and b.blocked_id=new.user_id)) then
      raise exception 'Conversa indisponível'; end if;
 end if;
 return new;
end $$;
drop trigger if exists network_messages_guard on public.network_messages;
create trigger network_messages_guard before insert on public.network_messages
for each row execute function public.network_message_guard();

-- Admin sees ONLY messages explicitly reported; no blanket access to private inboxes.
create or replace function public.network_moderation_queue()
returns table(report_id bigint,message_id bigint,reason text,sender_id uuid,body text,created_at timestamptz)
language sql stable security definer set search_path=public,pg_temp as $$
 select r.id,m.id,r.reason,m.user_id,m.body,r.created_at from public.network_reports r
 join public.network_messages m on m.id=r.message_id
 where public.is_admin() order by r.created_at desc limit 50
$$;
revoke all on function public.network_moderation_queue() from public;
grant execute on function public.network_moderation_queue() to authenticated;
create or replace function public.network_moderate_delete(mid bigint)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.is_admin() then raise exception 'Acesso restrito'; end if;
 if not exists(select 1 from public.network_reports where message_id=mid) then
   raise exception 'A mensagem precisa ter uma denúncia registrada'; end if;
 delete from public.network_messages where id=mid;
end $$;
revoke all on function public.network_moderate_delete(bigint) from public;
grant execute on function public.network_moderate_delete(bigint) to authenticated;

grant select,insert,update on public.network_profiles to authenticated;
grant select on public.network_conversations to authenticated;
grant select,update on public.network_participants to authenticated;
grant select,insert,delete on public.network_messages to authenticated;
grant select,insert on public.network_reports to authenticated;
grant usage,select on sequence public.network_messages_id_seq to authenticated;
grant usage,select on sequence public.network_reports_id_seq to authenticated;
do $$begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime')
 and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='network_messages')
 then alter publication supabase_realtime add table public.network_messages; end if;
end $$;
-- Retire legacy public-room access completely. The old room is not used or migrated.
revoke select,insert,update,delete on public.community_messages from authenticated;
