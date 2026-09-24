-- Piloting without required accounts: kudos can now be submitted by a visitor who
-- isn't signed in, the same way preceptor_name already lets a preceptor be named
-- without a registered account (see 202607140006). student_id becomes an optional
-- best-effort link, with student_name as the free-text fallback for guest submitters.
alter table public.kudos alter column student_id drop not null;
alter table public.kudos add column student_name text;

-- Guard against a display toggle pointing at nothing: if the submission isn't tied to
-- a real profile, showing a name requires one to have been typed.
alter table public.kudos add constraint kudos_display_name_source check (
  not display_student_name or student_id is not null or student_name is not null
);

drop policy "students submit own kudos" on public.kudos;
create policy "authenticated users submit own kudos" on public.kudos
for insert to authenticated with check (student_id = auth.uid() and status = 'pending');
create policy "anyone can submit kudos" on public.kudos
for insert to anon with check (student_id is null and status = 'pending');

grant insert on public.kudos to anon;
