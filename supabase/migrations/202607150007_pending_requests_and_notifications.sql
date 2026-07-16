-- A supervisor could not see a pending requester's name at all: the profiles read
-- policy only covers users with an ACTIVE membership, but someone who just signed up
-- and is awaiting approval has none yet. Add a policy scoped to pending role_requests.
create policy "supervisors read profiles for pending requests" on public.profiles
for select to authenticated using (
  exists (
    select 1 from public.role_requests rr
    where rr.user_id = profiles.id and rr.status = 'pending'
      and public.has_program_role(rr.location_program_id, array['supervisor','platform_admin']::public.app_role[])
  )
);

-- Same story as list_program_emails, but for pending requesters specifically: they
-- have no membership yet, so the existing RPC (scoped to active members) can't see
-- them either.
create or replace function public.list_pending_request_emails(program_id uuid)
returns table (user_id uuid, email text)
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.has_program_role(program_id, array['supervisor','platform_admin']::public.app_role[]) then
    raise exception 'Not authorized to list requests for this program';
  end if;

  return query
    select distinct u.id, u.email::text
    from auth.users u
    join public.role_requests rr on rr.user_id = u.id
    where rr.location_program_id = program_id and rr.status = 'pending';
end;
$$;

grant execute on function public.list_pending_request_emails(uuid) to authenticated;

-- /api/role-requests/notify-pending and notify-decision read this table directly via
-- the admin client -- same recurring lesson as kudos/schedule_documents: service_role
-- needs its own explicit grant even though it bypasses RLS.
grant select on public.role_requests to service_role;

-- Same notify routes embed location_programs -> afsc_programs; PostgREST requires a
-- grant on every table in an embed chain for the querying role, not just the top one.
grant select on public.afsc_programs to service_role;

-- The real handbook page groups subsections under 5 top-level headings (INTRODUCTION,
-- GENERAL STUDENT INFORMATION AND GUIDANCE, CUSTOMS AND COURTESIES, UNIFORMS, AMSA
-- PHASE II CLINICAL ROTATIONS) -- the flat section list didn't reflect that. table_data
-- holds the duty-hours schedule key as real structured rows instead of prose.
alter table public.handbook_sections add column section_group text;
alter table public.handbook_sections add column table_data jsonb;
