-- Her Way: one-click mentor approval with atomic profile creation.
-- Applied to Supabase project etjzuismhjnhwvkhtxga on 2026-11-11.
alter table public.mentor_applications
 add column if not exists photo_path text,
 add column if not exists mentor_id uuid references public.mentorships(id);
create unique index if not exists mentor_applications_approved_per_user_unique
 on public.mentor_applications(applicant_id) where status='approved';
create unique index if not exists mentor_applications_mentor_id_unique
 on public.mentor_applications(mentor_id) where mentor_id is not null;
drop policy if exists mentor_applications_admin_review on public.mentor_applications;
revoke update on public.mentor_applications from authenticated;
grant select,insert on public.mentor_applications to authenticated;
drop policy if exists mentor_applications_submit on public.mentor_applications;
create policy mentor_applications_submit on public.mentor_applications for insert to authenticated
with check(
 applicant_id=(select auth.uid()) and status='pending'
 and reviewed_at is null and reviewed_by is null and review_notes is null and mentor_id is null
 and resume_path like (select auth.uid())::text||'/%'
 and photo_path like 'students/'||(select auth.uid())::text||'/%'
);

create or replace function public.mentor_review_application(
 p_application_id uuid, p_decision text, p_notes text default null, p_photo_path text default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_app public.mentor_applications%rowtype;
 v_photo text;
 v_mentor_id uuid;
 v_mime text;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Acesso restrito à administração'; end if;
 if p_decision not in ('approved','rejected') then raise exception 'Decisão inválida'; end if;
 select * into v_app from public.mentor_applications where id=p_application_id for update;
 if not found then raise exception 'Candidatura não encontrada'; end if;
 if v_app.status<>'pending' then raise exception 'Esta candidatura já foi avaliada'; end if;
 if p_decision='rejected' then
  update public.mentor_applications set status='rejected',reviewed_at=now(),reviewed_by=auth.uid(),
  review_notes=left(nullif(trim(p_notes),''),1000) where id=v_app.id;
  return null;
 end if;
 v_photo:=coalesce(nullif(trim(p_photo_path),''),nullif(trim(v_app.photo_path),''),
   (select nullif(trim(profile_photo_path),'') from public.profiles where id=v_app.applicant_id));
 if v_photo is null or not(v_photo like 'students/'||v_app.applicant_id::text||'/%' or v_photo like 'mentors/%')
 then raise exception 'Foto obrigatória. Anexe uma imagem profissional antes de aprovar.'; end if;
 select metadata->>'mimetype' into v_mime from storage.objects
 where bucket_id='profile-photos' and name=v_photo;
 if v_mime is null or v_mime not in('image/png','image/jpeg','image/webp')
 then raise exception 'A foto não foi encontrada no armazenamento ou tem formato inválido'; end if;
 if exists(select 1 from public.mentor_applications where applicant_id=v_app.applicant_id and status='approved')
 then raise exception 'Esta pessoa já foi aprovada como mentora'; end if;
 insert into public.mentorships(mentor_name,mentor_role,specialty,bio,active,photo_url,photo_path)
 values(v_app.full_name,v_app.professional_role,v_app.specialty,left(v_app.motivation,900),true,
 'https://etjzuismhjnhwvkhtxga.supabase.co/storage/v1/object/public/profile-photos/'||v_photo,v_photo)
 returning id into v_mentor_id;
 update public.mentor_applications set status='approved',reviewed_at=now(),reviewed_by=auth.uid(),
 review_notes=left(nullif(trim(p_notes),''),1000),mentor_id=v_mentor_id,photo_path=v_photo where id=v_app.id;
 return v_mentor_id;
end $$;
revoke all on function public.mentor_review_application(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.mentor_review_application(uuid,text,text,text) to authenticated;
