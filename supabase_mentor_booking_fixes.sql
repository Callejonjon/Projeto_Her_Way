-- Fix availability to check all confirmed bookings while revealing no private student data.
create or replace function public.mentor_available_slots(p_mentor uuid)
returns table(id uuid,mentor_id uuid,starts_at timestamptz,ends_at timestamptz)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'Entre na Her Way'; end if;
 return query
 select s.id,s.mentor_id,s.starts_at,s.ends_at
 from public.mentor_slots s
 join public.mentorships m on m.id=s.mentor_id and m.active and m.photo_path is not null
 where s.mentor_id=p_mentor and s.starts_at > now()+interval '2 hours'
   and s.starts_at < now()+interval '61 days'
   and not exists(select 1 from public.mentor_bookings b where b.slot_id=s.id and b.status='confirmed')
 order by s.starts_at limit 150;
end $$;
revoke all on function public.mentor_available_slots(uuid) from public;
grant execute on function public.mentor_available_slots(uuid) to authenticated;

-- Keep booking history, but expire bookings whose sessions already ended,
-- so students can schedule their next mentorship without support intervention.
alter table public.mentor_bookings drop constraint if exists mentor_bookings_status_check;
alter table public.mentor_bookings add constraint mentor_bookings_status_check
 check(status in ('confirmed','cancelled','completed'));

create or replace function public.mentor_book_session(p_slot uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_student uuid:=auth.uid(); v_slot public.mentor_slots%rowtype; v_book_id uuid; v_path text;
begin
 if v_student is null then raise exception 'Entre na Her Way para reservar'; end if;
 select profile_photo_path into v_path from public.profiles where id=v_student;
 if v_path is null or not exists(select 1 from storage.objects where bucket_id='profile-photos' and name=v_path)
 then raise exception 'Para agendar uma mentoria, adicione primeiro uma foto no Meu Perfil'; end if;
 select * into v_slot from public.mentor_slots where id=p_slot for update;
 if not found then raise exception 'Horário não encontrado'; end if;
 if not exists(select 1 from public.mentorships where id=v_slot.mentor_id and active and photo_path is not null)
 then raise exception 'Mentora indisponível'; end if;
 if v_slot.starts_at <= now()+interval '2 hours' then raise exception 'Este horário não está mais disponível'; end if;
 update public.mentor_bookings b set status='completed'
 from public.mentor_slots s where b.slot_id=s.id and b.status='confirmed'
 and b.student_id=v_student and s.ends_at < now();
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
