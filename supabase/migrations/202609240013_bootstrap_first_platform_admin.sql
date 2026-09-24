-- Bootstrap the first platform admin (the portal owner) so there is someone to approve
-- everyone else. The account is matched by the SHA-256 of its lowercased email rather
-- than the email itself, which keeps the address out of this public repo. After this,
-- admins hand the role over from Dashboard → Manage users.
do $$
declare
  owner_id uuid;
begin
  select u.id into owner_id from auth.users u
  where encode(extensions.digest(lower(u.email), 'sha256'), 'hex') = 'e3a54d805b086795964ea5c6e4f059fc0ca584d63915d71c25ead45bc5b198e4';
  if owner_id is null then
    raise exception 'Owner account not found (% accounts exist). Sign up first.', (select count(*) from auth.users);
  end if;

  -- Admin at the location(s) requested at sign-up, or every location if none.
  insert into public.memberships (user_id, location_program_id, role, is_active)
  select owner_id, lp.id, 'platform_admin', true
  from public.location_programs lp
  where not exists (select 1 from public.role_requests r where r.user_id = owner_id)
     or exists (select 1 from public.role_requests r where r.user_id = owner_id and r.location_program_id = lp.id)
  on conflict (user_id, location_program_id, role) do update set is_active = true;

  update public.role_requests
  set status = 'approved', reviewed_at = now(), review_notes = 'Initial platform admin'
  where user_id = owner_id and status = 'pending';
end;
$$;
