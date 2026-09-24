-- Platform admin can only be granted by an existing admin from Manage users
-- (set_member_role), never through a sign-up role request. The sign-up form never
-- offered it, but the insert policy didn't forbid it, so a hand-crafted request for
-- platform_admin would have become an admin membership once any supervisor approved it.
drop policy "users submit role requests" on public.role_requests;
create policy "users submit role requests" on public.role_requests
for insert with check (user_id = auth.uid() and status = 'pending' and requested_role <> 'platform_admin');

-- Close out any such request already sitting in the queue.
update public.role_requests
set status = 'rejected', reviewed_at = now(), review_notes = 'Platform admin cannot be requested at sign-up'
where requested_role = 'platform_admin' and status = 'pending';

-- Defense in depth: approval itself refuses to grant platform admin.
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
  if approve and request_row.requested_role = 'platform_admin' then
    raise exception 'Platform admin cannot be granted through a sign-up request. Approve a lower role, then change it in Manage users.';
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
