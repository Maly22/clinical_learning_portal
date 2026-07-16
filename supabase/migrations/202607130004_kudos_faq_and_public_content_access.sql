-- Public read access for the marketing/location browsing surface, an FAQ table,
-- kudos star ratings, and the kudos moderation (dashboard + email-token) workflow.

-- This project's Data API now defaults to NOT auto-exposing tables (see
-- supabase/config.toml's `auto_expose_new_tables` comment) -- an RLS policy alone is
-- not enough, PostgREST also requires an explicit table-level GRANT for the calling
-- role. Migrations 1 and 3 added anon/authenticated RLS policies without the matching
-- GRANTs, so those tables (and therefore sign-up's location dropdown, role requests,
-- memberships, kudos, checklist progress, etc.) have been unreachable via the Data API
-- the whole time. Backfilling the missing grants here so both the existing features and
-- the new ones below actually work.
grant select on public.locations, public.afsc_programs, public.location_programs to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert on public.role_requests to authenticated;
grant select on public.memberships to authenticated;
grant select, insert, update, delete on public.user_notes to authenticated;
grant select, insert, update, delete on public.student_checklist_progress to authenticated;
grant select, insert on public.preceptor_feedback to authenticated;
grant select, insert on public.kudos to authenticated;

-- The service_role key is also subject to the always-revoked-by-default table grants
-- (it is not special-cased the way row-level security is bypassed for it) -- so the
-- kudos email-review flow and the kudos-submit preceptor lookup, both of which read
-- these tables directly via the admin/service-role client rather than through a
-- security-definer RPC, need their own explicit grants too.
grant select on public.kudos, public.memberships, public.profiles, public.location_departments,
  public.departments, public.location_programs, public.locations to service_role;

-- Reference/catalog content is safe to expose publicly, matching the precedent set in
-- migration 3 ("signup choices are public reference data"). Without these policies
-- /locations/** cannot render at all: every one of these tables has RLS enabled with
-- no SELECT policy yet.
create policy "public reads department categories" on public.department_categories
for select to anon, authenticated using (true);

create policy "public reads departments" on public.departments
for select to anon, authenticated using (true);

create policy "public reads active location departments" on public.location_departments
for select to anon, authenticated using (
  is_active and exists (
    select 1 from public.location_programs lp
    where lp.id = location_departments.location_program_id and lp.is_active
  )
);

create policy "public reads checklist items" on public.checklist_items
for select to anon, authenticated using (true);

create policy "public reads active learning resources" on public.learning_resources
for select to anon, authenticated using (is_active);

grant select on public.department_categories, public.departments, public.location_departments,
  public.checklist_items, public.learning_resources to anon, authenticated;

-- Widen the existing content-catalog policies (migration 2) to anon so location pages
-- are browsable before sign-up, consistent with the tables above.
drop policy "authenticated users read published procedures" on public.department_procedures;
create policy "public reads published procedures" on public.department_procedures
for select to anon, authenticated using (status = 'published');

drop policy "authenticated users read published handbooks" on public.handbooks;
create policy "public reads published handbooks" on public.handbooks
for select to anon, authenticated using (status = 'published');

drop policy "authenticated users read published handbook sections" on public.handbook_sections;
create policy "public reads published handbook sections" on public.handbook_sections
for select to anon, authenticated using (exists (
  select 1 from public.handbooks h
  where h.id = handbook_id and h.status = 'published'
));

drop policy "authenticated users read active event sources" on public.event_sources;
create policy "public reads active event sources" on public.event_sources
for select to anon, authenticated using (is_active);

drop policy "authenticated users read active contacts" on public.location_contacts;
create policy "public reads active contacts" on public.location_contacts
for select to anon, authenticated using (is_active);

grant select on public.department_procedures, public.handbooks, public.handbook_sections,
  public.event_sources, public.location_contacts to anon, authenticated;

-- FAQs: global (location_id null) or per-location.
create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references public.locations(id),
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.faqs enable row level security;

create policy "public reads active faqs" on public.faqs
for select to anon, authenticated using (is_active);

grant select on public.faqs to anon, authenticated;

-- Kudos: star rating and a single-use decision token for the email approve/reject flow.
alter table public.kudos add column rating smallint;
alter table public.kudos add constraint kudos_rating_check check (rating between 1 and 5);
alter table public.kudos alter column rating set not null;

alter table public.kudos add column decision_token uuid not null default gen_random_uuid();
create unique index kudos_decision_token_idx on public.kudos(decision_token);

-- Supervisors need to see pending kudos for their program(s) in the dashboard queue.
create policy "supervisors read program kudos" on public.kudos
for select to authenticated using (
  exists (
    select 1 from public.location_departments ld
    join public.location_programs lp on lp.id = ld.location_program_id
    where ld.id = kudos.location_department_id
      and public.has_program_role(lp.id, array['supervisor','platform_admin']::public.app_role[])
  )
);

-- Published kudos form the public gallery on department pages.
create policy "public reads approved kudos" on public.kudos
for select to anon, authenticated using (status = 'approved');

grant select on public.kudos to anon;

-- The public gallery embeds the submitting student's name (when display_student_name is
-- true), which needs its own read path into profiles: the existing "users read own
-- profile" policy only lets someone read their own row, so without this a gallery
-- viewer who isn't the author would always see a null embed regardless of the toggle.
create policy "public reads profiles behind visible kudos" on public.profiles
for select to anon, authenticated using (
  exists (
    select 1 from public.kudos k
    where k.student_id = profiles.id and k.status = 'approved' and k.display_student_name
  )
);

grant select on public.profiles to anon;

-- Shared moderation logic used by both the authenticated RPC and the token RPC below.
create or replace function public._apply_kudos_moderation(kudos_id uuid, approve boolean, reason text, moderator uuid)
returns public.kudos
language plpgsql
security definer set search_path = ''
as $$
declare
  kudos_row public.kudos;
begin
  select * into kudos_row from public.kudos where id = kudos_id for update;
  if kudos_row.id is null then raise exception 'Kudos not found'; end if;
  if kudos_row.status <> 'pending' then raise exception 'Kudos already reviewed'; end if;

  update public.kudos
  set status = (case when approve then 'approved' else 'rejected' end)::public.review_status,
      moderated_by = moderator, moderated_at = now(), moderation_reason = reason,
      published_at = case when approve then now() else null end
  where id = kudos_id returning * into kudos_row;

  return kudos_row;
end;
$$;

-- Used by the supervisor dashboard queue (authenticated session).
create or replace function public.moderate_kudos(kudos_id uuid, approve boolean, reason text default null)
returns public.kudos
language plpgsql
security definer set search_path = ''
as $$
declare
  kudos_row public.kudos;
  program_id uuid;
begin
  select * into kudos_row from public.kudos where id = kudos_id;
  if kudos_row.id is null then raise exception 'Kudos not found'; end if;

  select lp.id into program_id
  from public.location_departments ld
  join public.location_programs lp on lp.id = ld.location_program_id
  where ld.id = kudos_row.location_department_id;

  if not public.has_program_role(program_id, array['supervisor','platform_admin']::public.app_role[]) then
    raise exception 'Not authorized to review this kudos';
  end if;

  return public._apply_kudos_moderation(kudos_id, approve, reason, auth.uid());
end;
$$;

grant execute on function public.moderate_kudos(uuid, boolean, text) to authenticated;

-- Used only by the /api/kudos-review/[token] route via the service-role client. The
-- possession of `token` is the authorization (no auth.uid() exists in that flow), so
-- this is deliberately NOT granted to anon/authenticated: it must never be callable
-- directly from a browser Supabase client, only from the trusted server route.
create or replace function public.moderate_kudos_by_token(token uuid, approve boolean, reason text default null)
returns public.kudos
language plpgsql
security definer set search_path = ''
as $$
declare
  kudos_row public.kudos;
begin
  select * into kudos_row from public.kudos where decision_token = token;
  if kudos_row.id is null then raise exception 'Invalid token'; end if;
  return public._apply_kudos_moderation(kudos_row.id, approve, reason, null);
end;
$$;

-- Patches the same real (not just lint-cosmetic) bug found and fixed above in
-- _apply_kudos_moderation: assigning an untyped CASE expression's two string branches
-- directly to an enum column fails at runtime ("column is of type review_status but
-- expression is of type text"), so this RPC has never actually worked. Re-created here
-- rather than editing the already-applied migration 3 definition.
create or replace function public.approve_role_request(request_id uuid, approve boolean, notes text default null)
returns public.role_requests
language plpgsql
security definer set search_path = ''
as $$
declare
  request_row public.role_requests;
begin
  select * into request_row from public.role_requests where id = request_id for update;
  if request_row.id is null then raise exception 'Role request not found'; end if;
  if request_row.status <> 'pending' then raise exception 'Role request already reviewed'; end if;
  if not public.has_program_role(request_row.location_program_id, array['supervisor','platform_admin']::public.app_role[]) then
    raise exception 'Not authorized to review this request';
  end if;

  update public.role_requests
  set status = (case when approve then 'approved' else 'rejected' end)::public.review_status,
      reviewed_by = auth.uid(), reviewed_at = now(), review_notes = notes
  where id = request_id returning * into request_row;

  if approve then
    insert into public.memberships (user_id, location_program_id, role, approved_by)
    values (request_row.user_id, request_row.location_program_id, request_row.requested_role, auth.uid())
    on conflict (user_id, location_program_id, role)
    do update set is_active=true, approved_by=auth.uid(), approved_at=now();
  end if;
  return request_row;
end;
$$;
