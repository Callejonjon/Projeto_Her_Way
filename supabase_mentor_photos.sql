-- Her Way: profile photos, mentor photos and one-time XP on first verified upload.
alter table public.profiles add column if not exists profile_photo_path text;
alter table public.mentorships add column if not exists photo_url text;
alter table public.mentorships add column if not exists photo_path text;
create table if not exists public.profile_achievements(
 user_id uuid not null references auth.users(id) on delete cascade,
 achievement text not null check (achievement in ('profile_photo')),
 awarded_at timestamptz not null default now(),
 primary key(user_id,achievement)
);
alter table public.profile_achievements enable row level security;
drop policy if exists profile_achievements_self_read on public.profile_achievements;
create policy profile_achievements_self_read on public.profile_achievements for select to authenticated using(user_id=auth.uid());
revoke insert,update,delete on public.profile_achievements from anon,authenticated;
grant select on public.profile_achievements to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('profile-photos','profile-photos',true,2097152,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=2097152,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists profile_photos_upload on storage.objects;
create policy profile_photos_upload on storage.objects for insert to authenticated
with check(bucket_id='profile-photos' and (
 (name like 'students/'||auth.uid()::text||'/%') or
 (name like 'mentors/%' and public.is_admin())
));
drop policy if exists profile_photos_delete on storage.objects;
create policy profile_photos_delete on storage.objects for delete to authenticated
using(bucket_id='profile-photos' and (
 name like 'students/'||auth.uid()::text||'/%' or
 (name like 'mentors/%' and public.is_admin())
));

create or replace function public.profile_register_photo(p_storage_path text)
returns table(photo_url text,xp_awarded int,current_xp int,current_level int)
language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); got int; next_xp int; next_level int; url text;
begin
 if u is null then raise exception 'Faça login para enviar foto'; end if;
 if p_storage_path not like 'students/'||u::text||'/%' then raise exception 'Caminho de imagem inválido'; end if;
 if not exists(select 1 from storage.objects o where o.bucket_id='profile-photos'
  and o.name=p_storage_path and o.metadata->>'mimetype' in('image/jpeg','image/png','image/webp'))
 then raise exception 'Imagem não encontrada no armazenamento'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,2026));
 url:='https://etjzuismhjnhwvkhtxga.supabase.co/storage/v1/object/public/profile-photos/'||p_storage_path;
 insert into public.profile_achievements(user_id,achievement)
 values(u,'profile_photo') on conflict do nothing;
 get diagnostics got = row_count;
 update public.profiles set profile_photo_path=p_storage_path,avatar_url=url,
   xp=xp+case when got=1 then 30 else 0 end
 where id=u returning xp into next_xp;
 if not found then raise exception 'Perfil não encontrado'; end if;
 next_level:=case when next_xp>=1400 then 5 when next_xp>=900 then 4
  when next_xp>=500 then 3 when next_xp>=200 then 2 else 1 end;
 update public.profiles set level=greatest(level,next_level) where id=u;
 return query select url,case when got=1 then 30 else 0 end,next_xp,next_level;
end $$;
revoke all on function public.profile_register_photo(text) from public;
grant execute on function public.profile_register_photo(text) to authenticated;

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

drop function if exists public.mentor_admin_create(text,text,text,text);
create or replace function public.mentor_admin_create(
 p_name text,p_role text,p_specialty text,p_bio text,p_photo_path text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; v_name text:=btrim(coalesce(p_name,'')); v_role text:=btrim(coalesce(p_role,''));
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Acesso restrito'; end if;
 if length(v_name)<5 or length(v_name)>100 or length(v_role)<4 or length(v_role)>120
 then raise exception 'Informe nome completo e cargo profissional'; end if;
 if p_specialty not in('Asset Management','Investment Banking','Crédito','Research','Tech & Dados')
 then raise exception 'Especialidade inválida'; end if;
 if p_photo_path not like 'mentors/%' or not exists(select 1 from storage.objects where bucket_id='profile-photos'
 and name=p_photo_path and metadata->>'mimetype' in('image/jpeg','image/png','image/webp'))
 then raise exception 'Envie uma foto válida da mentora antes de cadastrar'; end if;
 insert into public.mentorships(mentor_name,mentor_role,specialty,bio,active,photo_url,photo_path)
 values(v_name,v_role,p_specialty,left(btrim(coalesce(p_bio,'')),900),true,
 'https://etjzuismhjnhwvkhtxga.supabase.co/storage/v1/object/public/profile-photos/'||p_photo_path,
 p_photo_path)
 returning id into v_id;
 return v_id;
end $$;
revoke all on function public.mentor_admin_create(text,text,text,text,text) from public;
grant execute on function public.mentor_admin_create(text,text,text,text,text) to authenticated;
