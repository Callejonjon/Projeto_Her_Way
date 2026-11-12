-- Her Way: Google Meet booking metadata (applied to hosted Supabase on 2026-11-12).
alter table public.mentor_bookings
 add column if not exists meet_url text,
 add column if not exists google_event_id text,
 add column if not exists meet_status text not null default 'pending',
 add column if not exists meet_error text,
 add column if not exists meet_synced_at timestamptz;
alter table public.mentor_bookings
 drop constraint if exists mentor_bookings_meet_status_check;
alter table public.mentor_bookings
 add constraint mentor_bookings_meet_status_check
 check (meet_status in ('pending','ready','failed','cancelled'));
create index if not exists mentor_bookings_google_event_idx
 on public.mentor_bookings(google_event_id) where google_event_id is not null;
drop policy if exists mentor_bookings_mentor_read on public.mentor_bookings;
create policy mentor_bookings_mentor_read on public.mentor_bookings
 for select to authenticated using (
 exists (
  select 1 from public.mentor_slots s
  join public.mentorships m on m.id=s.mentor_id
  where s.id=slot_id and m.user_id=(select auth.uid())
 )
);
