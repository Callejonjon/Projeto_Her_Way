-- Her Way — agenda real de mentorias, 30 min, horário de Brasília
-- Não altera solicitações de mentoria anteriores nem cria reservas fictícias.
create table if not exists public.mentor_slots (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.mentorships(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz generated always as (starts_at + interval '30 minutes') stored,
  created_at timestamptz not null default now(),
  unique(mentor_id,starts_at)
);
create index if not exists mentor_slots_mentor_time_idx on public.mentor_slots(mentor_id,starts_at);

create table if not exists public.mentor_bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.mentor_slots(id) on delete restrict,
  student_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'confirmed' check(status in('confirmed','cancelled')),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);
create unique index if not exists mentor_bookings_one_active_per_slot
on public.mentor_bookings(slot_id) where status='confirmed';
create unique index if not exists mentor_bookings_one_active_per_student
on public.mentor_bookings(student_id) where status='confirmed';
create index if not exists mentor_bookings_student_idx on public.mentor_bookings(student_id,created_at desc);

alter table public.mentor_slots enable row level security;
alter table public.mentor_bookings enable row level security;

drop policy if exists mentor_slots_read on public.mentor_slots;
create policy mentor_slots_read on public.mentor_slots for select to authenticated
using (true);
drop policy if exists mentor_bookings_read on public.mentor_bookings;
create policy mentor_bookings_read on public.mentor_bookings for select to authenticated
using(student_id=(select auth.uid()) or public.is_admin());

-- Only RPC can mutate slots/bookings: no INSERT/UPDATE/DELETE privileges for ordinary users.
revoke insert,update,delete on public.mentor_slots from anon,authenticated;
revoke insert,update,delete on public.mentor_bookings from anon,authenticated;
grant select on public.mentor_slots,public.mentor_bookings to authenticated;

create or replace function public.mentor_available_slots(p_mentor uuid)
returns table(id uuid,mentor_id uuid,starts_at timestamptz,ends_at timestamptz)
language sql stable security invoker set search_path=public,pg_temp as $$
 select s.id,s.mentor_id,s.starts_at,s.ends_at
 from public.mentor_slots s
 join public.mentorships m on m.id=s.mentor_id and m.active
 where s.mentor_id=p_mentor and s.starts_at > now()+interval '2 hours'
   and s.starts_at < now()+interval '61 days'
   and not exists(select 1 from public.mentor_bookings b
                  where b.slot_id=s.id and b.status='confirmed')
 order by s.starts_at limit 150;
$$;
revoke all on function public.mentor_available_slots(uuid) from public;
grant execute on function public.mentor_available_slots(uuid) to authenticated;

create or replace function public.mentor_create_slot(p_mentor uuid,p_brasilia timestamp without time zone)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_start timestamptz; v_id uuid;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Somente administradoras podem disponibilizar horários'; end if;
 if not exists(select 1 from public.mentorships where id=p_mentor and active)
 then raise exception 'Mentora não está ativa'; end if;
 if extract(minute from p_brasilia) not in(0,30) or extract(second from p_brasilia) <> 0
 then raise exception 'Horários devem começar em horas cheias ou meia hora'; end if;
 v_start := p_brasilia at time zone 'America/Sao_Paulo';
 if v_start <= now()+interval '2 hours' or v_start >= now()+interval '60 days'
 then raise exception 'Escolha um horário entre 2 horas e 60 dias no futuro'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_mentor::text,2026));
 if exists (
   select 1 from public.mentor_slots s where s.mentor_id=p_mentor
     and tstzrange(s.starts_at,s.ends_at,'[)')
      && tstzrange(v_start,v_start+interval '30 minutes','[)')
 ) then raise exception 'Horário já existe ou se sobrepõe a outro'; end if;
 insert into public.mentor_slots(mentor_id,starts_at) values(p_mentor,v_start) returning id into v_id;
 return v_id;
end $$;
revoke all on function public.mentor_create_slot(uuid,timestamp without time zone) from public;
grant execute on function public.mentor_create_slot(uuid,timestamp without time zone) to authenticated;

create or replace function public.mentor_book_session(p_slot uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_student uuid:=auth.uid(); v_slot public.mentor_slots%rowtype; v_book_id uuid;
begin
 if v_student is null then raise exception 'Entre na Her Way para reservar'; end if;
 -- A unique partial index additionally guarantees exclusivity under concurrent inserts.
 select * into v_slot from public.mentor_slots where id=p_slot for update;
 if not found then raise exception 'Horário não encontrado'; end if;
 if not exists(select 1 from public.mentorships where id=v_slot.mentor_id and active)
 then raise exception 'Mentora indisponível'; end if;
 if v_slot.starts_at <= now()+interval '2 hours' then raise exception 'Este horário não está mais disponível'; end if;
 if exists(select 1 from public.mentor_bookings where slot_id=p_slot and status='confirmed')
 then raise exception 'Este horário já foi reservado'; end if;
 if exists(select 1 from public.mentor_bookings where student_id=v_student and status='confirmed')
 then raise exception 'Você já possui uma mentoria agendada. Cancele-a antes de reservar outra'; end if;
 insert into public.mentor_bookings(slot_id,student_id,status)
 values(p_slot,v_student,'confirmed') returning id into v_book_id;
 return v_book_id;
exception when unique_violation then
 raise exception 'O horário acabou de ser reservado ou você já possui outra reserva';
end $$;
revoke all on function public.mentor_book_session(uuid) from public;
grant execute on function public.mentor_book_session(uuid) to authenticated;

create or replace function public.mentor_cancel_session(p_booking uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_row public.mentor_bookings%rowtype;
begin
 if auth.uid() is null then raise exception 'Entre na Her Way'; end if;
 select * into v_row from public.mentor_bookings where id=p_booking for update;
 if not found or v_row.status<>'confirmed' then raise exception 'Reserva não encontrada ou já cancelada'; end if;
 if v_row.student_id<>auth.uid() and not public.is_admin() then raise exception 'Sem permissão para cancelar esta reserva'; end if;
 update public.mentor_bookings set status='cancelled',cancelled_at=now() where id=p_booking;
end $$;
revoke all on function public.mentor_cancel_session(uuid) from public;
grant execute on function public.mentor_cancel_session(uuid) to authenticated;

create or replace function public.mentor_remove_slot(p_slot uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Acesso restrito'; end if;
 if exists(select 1 from public.mentor_bookings where slot_id=p_slot and status='confirmed')
 then raise exception 'Cancele a reserva confirmada antes de remover o horário'; end if;
 -- Preserve booking history: slots with cancelled bookings cannot be physically removed.
 if exists(select 1 from public.mentor_bookings where slot_id=p_slot) then
   raise exception 'Este horário já tem histórico. Não pode ser excluído';
 end if;
 delete from public.mentor_slots where id=p_slot;
end $$;
revoke all on function public.mentor_remove_slot(uuid) from public;
grant execute on function public.mentor_remove_slot(uuid) to authenticated;

-- Administrator can register a genuine mentor without granting her admin rights.
create or replace function public.mentor_admin_create(
 p_name text,p_role text,p_specialty text,p_bio text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; v_name text:=btrim(coalesce(p_name,'')); v_role text:=btrim(coalesce(p_role,''));
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Acesso restrito'; end if;
 if length(v_name)<5 or length(v_name)>100 or length(v_role)<4 or length(v_role)>120
 then raise exception 'Informe nome completo e cargo profissional'; end if;
 if p_specialty not in ('Asset Management','Investment Banking','Crédito','Research','Tech & Dados')
 then raise exception 'Especialidade inválida'; end if;
 insert into public.mentorships(mentor_name,mentor_role,specialty,bio,active)
 values(v_name,v_role,p_specialty,left(btrim(coalesce(p_bio,'')),900),true)
 returning id into v_id;
 return v_id;
end $$;
revoke all on function public.mentor_admin_create(text,text,text,text) from public;
grant execute on function public.mentor_admin_create(text,text,text,text) to authenticated;
