-- Dashboard → Edit content: supervisors and platform admins edit their location's
-- content (handbook, FAQs, departments, procedures, contacts, events) without code.
-- Location-scoped rows are editable by that location's supervisors/admins; shared rows
-- (location_id null: the general handbook, global FAQs/events) by platform admins only.

-- Security definer for the same reason as has_program_role: memberships' own RLS would
-- hide the rows these checks need to see.
create or replace function public.can_edit_location(target_location uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    join public.location_programs lp on lp.id = m.location_program_id
    where m.user_id = auth.uid() and m.is_active
      and m.role in ('supervisor', 'platform_admin')
      and lp.location_id = target_location
  );
$$;

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid() and m.is_active and m.role = 'platform_admin'
  );
$$;

create or replace function public.can_edit_scoped(target_location uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case when target_location is null then public.is_platform_admin()
              else public.can_edit_location(target_location) end;
$$;

revoke execute on function public.can_edit_location(uuid), public.is_platform_admin(), public.can_edit_scoped(uuid) from public, anon;
grant execute on function public.can_edit_location(uuid), public.is_platform_admin(), public.can_edit_scoped(uuid) to authenticated;

create policy "editors manage faqs" on public.faqs
for all to authenticated using (public.can_edit_scoped(location_id)) with check (public.can_edit_scoped(location_id));

create policy "editors manage contacts" on public.location_contacts
for all to authenticated using (public.can_edit_location(location_id)) with check (public.can_edit_location(location_id));

create policy "editors manage events" on public.event_sources
for all to authenticated using (public.can_edit_scoped(location_id)) with check (public.can_edit_scoped(location_id));

create policy "editors update location departments" on public.location_departments
for update to authenticated
using (public.has_program_role(location_program_id, array['supervisor','platform_admin']::public.app_role[]))
with check (public.has_program_role(location_program_id, array['supervisor','platform_admin']::public.app_role[]));

-- Covers select too, so editors also see draft (unpublished) procedures.
create policy "editors manage procedures" on public.department_procedures
for all to authenticated
using (exists (select 1 from public.location_departments ld where ld.id = location_department_id
  and public.has_program_role(ld.location_program_id, array['supervisor','platform_admin']::public.app_role[])))
with check (exists (select 1 from public.location_departments ld where ld.id = location_department_id
  and public.has_program_role(ld.location_program_id, array['supervisor','platform_admin']::public.app_role[])));

create policy "editors manage handbook sections" on public.handbook_sections
for all to authenticated
using (exists (select 1 from public.handbooks h where h.id = handbook_id and public.can_edit_scoped(h.location_id)))
with check (exists (select 1 from public.handbooks h where h.id = handbook_id and public.can_edit_scoped(h.location_id)));

grant select, insert, update, delete on public.faqs, public.location_contacts, public.event_sources,
  public.department_procedures, public.handbook_sections to authenticated;
-- Column-scoped: editors change a department's text, not which location/department it is.
grant update (display_name, overview, required_hours, welcome_video_url) on public.location_departments to authenticated;
