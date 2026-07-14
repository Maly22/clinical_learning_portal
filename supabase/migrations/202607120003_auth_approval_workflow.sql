-- Create an application profile and pending role request from trusted signup metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  requested_program uuid;
  requested_role public.app_role;
begin
  requested_program := nullif(new.raw_user_meta_data ->> 'location_program_id', '')::uuid;
  requested_role := coalesce(nullif(new.raw_user_meta_data ->> 'requested_role', ''), 'student')::public.app_role;

  if requested_role not in ('student', 'preceptor', 'supervisor') then
    raise exception 'Unsupported requested role';
  end if;

  insert into public.profiles (id, first_name, last_name, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''), 'New'),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'last_name'), ''), 'User'),
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), '')
  );

  if requested_program is not null then
    insert into public.role_requests (user_id, location_program_id, requested_role)
    values (new.id, requested_program, requested_role);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Signup choices are public reference data. Operational records remain protected.
create policy "public reads active locations" on public.locations
for select to anon, authenticated using (is_active and archived_at is null);
create policy "public reads active programs" on public.afsc_programs
for select to anon, authenticated using (is_active);
create policy "public reads active location programs" on public.location_programs
for select to anon, authenticated using (is_active);

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
  set status = case when approve then 'approved' else 'rejected' end,
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

grant execute on function public.approve_role_request(uuid, boolean, text) to authenticated;

create policy "supervisors read program role requests" on public.role_requests
for select to authenticated using (
  user_id = auth.uid() or
  public.has_program_role(location_program_id, array['supervisor','platform_admin']::public.app_role[])
);

create policy "supervisors read program memberships" on public.memberships
for select to authenticated using (
  user_id = auth.uid() or
  public.has_program_role(location_program_id, array['supervisor','platform_admin']::public.app_role[])
);
