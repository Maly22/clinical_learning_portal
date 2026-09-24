-- Lets a platform admin change a member's role from Dashboard → Manage users, including
-- handing platform admin to someone else (e.g. a supervisor) and stepping down.
-- A user keeps one active role per location program: the new role's membership is
-- (re)activated and their other roles there are deactivated (kept for history).
create or replace function public.set_member_role(target_user uuid, program_id uuid, new_role public.app_role)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.has_program_role(program_id, array['platform_admin']::public.app_role[]) then
    raise exception 'Only a platform admin can change roles';
  end if;
  if not exists (select 1 from public.memberships where user_id = target_user and location_program_id = program_id and is_active) then
    raise exception 'That user is not an active member of this location';
  end if;

  insert into public.memberships (user_id, location_program_id, role, approved_by, approved_at, is_active)
  values (target_user, program_id, new_role, auth.uid(), now(), true)
  on conflict (user_id, location_program_id, role)
  do update set is_active = true, approved_by = auth.uid(), approved_at = now();

  update public.memberships set is_active = false
  where user_id = target_user and location_program_id = program_id and role <> new_role and is_active;

  if not exists (select 1 from public.memberships where location_program_id = program_id and role = 'platform_admin' and is_active) then
    raise exception 'Each location needs at least one platform admin. Make someone else admin first.';
  end if;
end;
$$;

revoke execute on function public.set_member_role(uuid, uuid, public.app_role) from public, anon;
grant execute on function public.set_member_role(uuid, uuid, public.app_role) to authenticated;

-- The first platform admin is granted by hand in the Supabase SQL Editor (kept out of
-- this public repo); after that, admins hand the role over from Manage users.
