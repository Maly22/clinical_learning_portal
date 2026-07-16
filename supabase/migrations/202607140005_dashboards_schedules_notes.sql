-- Real per-role dashboards: classes/schedules (reusing the existing, previously-unused
-- cohorts/cohort_enrollments tables), per-student supervisor notes, preceptor checklist
-- sign-off, and the "Manage Users" / "Student List" read paths.

-- A supervisor's private note can optionally be "about" a specific student.
alter table public.user_notes add column subject_user_id uuid references public.profiles(id);

-- Re-requested "Date of shift" field on kudos.
alter table public.kudos add column shift_date date;

-- Cohorts ("classes"): RLS-enabled since migration 1 with zero policies -- same latent
-- bug as locations/departments/etc. before this month's fix.
create policy "supervisors manage program cohorts" on public.cohorts
for all to authenticated
using (public.has_program_role(location_program_id, array['supervisor','platform_admin']::public.app_role[]))
with check (public.has_program_role(location_program_id, array['supervisor','platform_admin']::public.app_role[]));

-- security definer so this doesn't re-trigger cohort_enrollments' own RLS (which in
-- turn reads cohorts) -- a direct EXISTS subquery here caused infinite recursion.
create or replace function public.is_enrolled_in_cohort(target_cohort uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.cohort_enrollments
    where cohort_id = target_cohort and student_id = auth.uid()
  );
$$;

grant execute on function public.is_enrolled_in_cohort(uuid) to authenticated;

create policy "students read own cohort" on public.cohorts
for select to authenticated using (public.is_enrolled_in_cohort(id));

grant select, insert, update on public.cohorts to authenticated;

create policy "supervisors manage cohort enrollments" on public.cohort_enrollments
for all to authenticated
using (exists (
  select 1 from public.cohorts c
  where c.id = cohort_enrollments.cohort_id
    and public.has_program_role(c.location_program_id, array['supervisor','platform_admin']::public.app_role[])
))
with check (exists (
  select 1 from public.cohorts c
  where c.id = cohort_enrollments.cohort_id
    and public.has_program_role(c.location_program_id, array['supervisor','platform_admin']::public.app_role[])
));

create policy "students read own enrollment" on public.cohort_enrollments
for select to authenticated using (student_id = auth.uid());

grant select, insert, delete on public.cohort_enrollments to authenticated;

-- Schedules: supervisor-uploaded files, assigned to a class (cohort) or an individual
-- student. Files live in a private Storage bucket mediated entirely by two server
-- routes (upload, download) using the admin client -- there are deliberately no
-- storage.objects policies, so the bucket is unreachable except through those routes.
create table public.schedule_documents (
  id uuid primary key default gen_random_uuid(),
  location_program_id uuid not null references public.location_programs(id),
  cohort_id uuid references public.cohorts(id),
  student_id uuid references public.profiles(id),
  title text not null,
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  uploaded_by uuid not null references public.profiles(id),
  uploaded_at timestamptz not null default now(),
  is_active boolean not null default true,
  check (cohort_id is not null or student_id is not null)
);

alter table public.schedule_documents enable row level security;

create policy "supervisors manage program schedules" on public.schedule_documents
for all to authenticated
using (public.has_program_role(location_program_id, array['supervisor','platform_admin']::public.app_role[]))
with check (public.has_program_role(location_program_id, array['supervisor','platform_admin']::public.app_role[]));

create policy "students read own schedules" on public.schedule_documents
for select to authenticated using (
  is_active and (student_id = auth.uid() or public.is_enrolled_in_cohort(cohort_id))
);

grant select on public.schedule_documents to authenticated;

-- /api/schedules/upload writes this row via the admin (service_role) client, after
-- validating the caller itself via the cookie-session client -- service_role needs its
-- own explicit grant for that write, same lesson as the rest of this migration.
grant select, insert on public.schedule_documents to service_role;

-- has_program_role was previously only ever called from inside RLS policies / other
-- security-definer functions; the schedule-upload route now calls it directly via
-- .rpc() from an authenticated session, so it needs its own explicit execute grant.
grant execute on function public.has_program_role(uuid, public.app_role[]) to authenticated;

insert into storage.buckets (id, name, public) values ('schedules', 'schedules', false)
on conflict (id) do nothing;

-- Preceptor checklist sign-off.
alter table public.student_checklist_progress add column signed_off_by uuid references public.profiles(id);
alter table public.student_checklist_progress add column signed_off_at timestamptz;

-- A plain RLS-policy subquery against memberships here would silently see nothing for
-- a preceptor caller: memberships' own RLS only lets supervisors (not preceptors) read
-- another user's row, so the join would filter out the student's membership before the
-- policy ever got to evaluate it. security definer bypasses that (same fix shape as
-- is_enrolled_in_cohort above), and this is also reused inside sign_off_checklist_item
-- below instead of duplicating the same join there.
create or replace function public.shares_active_program(target_user uuid, allowed_roles public.app_role[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships target_m
    join public.memberships caller_m
      on caller_m.location_program_id = target_m.location_program_id
     and caller_m.role = any (allowed_roles) and caller_m.is_active
    where target_m.user_id = target_user
      and target_m.is_active
      and caller_m.user_id = auth.uid()
  );
$$;

grant execute on function public.shares_active_program(uuid, public.app_role[]) to authenticated;

-- Preceptors sign off on checklists; supervisors also need read access for the
-- student detail page in "Student List".
create policy "program staff read student checklists" on public.student_checklist_progress
for select to authenticated using (
  public.shares_active_program(student_id, array['preceptor','supervisor','platform_admin']::public.app_role[])
);

create or replace function public.sign_off_checklist_item(p_student_id uuid, p_checklist_item_id uuid)
returns public.student_checklist_progress
language plpgsql
security definer set search_path = ''
as $$
declare
  progress_row public.student_checklist_progress;
begin
  if not public.shares_active_program(p_student_id, array['preceptor']::public.app_role[]) then
    raise exception 'Not authorized to sign off this student''s checklist';
  end if;

  insert into public.student_checklist_progress (student_id, checklist_item_id, signed_off_by, signed_off_at)
  values (p_student_id, p_checklist_item_id, auth.uid(), now())
  on conflict (student_id, checklist_item_id)
  do update set signed_off_by = auth.uid(), signed_off_at = now()
  returning * into progress_row;

  return progress_row;
end;
$$;

grant execute on function public.sign_off_checklist_item(uuid, uuid) to authenticated;

-- Migration 3 only ever let supervisors see other members' membership rows; preceptors
-- had none, so "Student Checklists" (which looks up its own program's students
-- directly against memberships) silently found nothing. Reuses shares_active_program
-- from above rather than a raw self-referential subquery on memberships.
create policy "program staff read program memberships" on public.memberships
for select to authenticated using (
  public.shares_active_program(user_id, array['preceptor','supervisor','platform_admin']::public.app_role[])
);

-- "Manage Users" / "Student List" need to read program-mates' names.
-- Also covers preceptors reading a student's name for "Student Checklists" -- a raw
-- has_program_role(supervisor-only) check here would leave that page with the exact
-- same null-profile symptom the memberships policy above just needed fixing for.
create policy "program staff read program member profiles" on public.profiles
for select to authenticated using (
  public.shares_active_program(id, array['preceptor','supervisor','platform_admin']::public.app_role[])
);

-- Email lives in auth.users, which authenticated can never read directly -- this is
-- the one genuinely privileged lookup "Manage Users" needs; everything else about a
-- member comes from the normal RLS-protected memberships/profiles read above.
create or replace function public.list_program_emails(program_id uuid)
returns table (user_id uuid, email text)
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.has_program_role(program_id, array['supervisor','platform_admin']::public.app_role[]) then
    raise exception 'Not authorized to list members of this program';
  end if;

  return query
    select u.id, u.email::text
    from auth.users u
    join public.memberships m on m.user_id = u.id
    where m.location_program_id = program_id and m.is_active;
end;
$$;

grant execute on function public.list_program_emails(uuid) to authenticated;
