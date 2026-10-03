-- Add Keesler AFB (Biloxi, Mississippi) as a Phase II location with 4N0 enabled.

insert into public.locations (organization_id, name, short_name, slug, installation_code, timezone) values
('00000000-0000-0000-0000-000000000001', 'Keesler Air Force Base', 'Keesler AFB', 'keesler-afb', 'KEESLER', 'America/Chicago')
on conflict (installation_code) do nothing;

insert into public.location_programs (location_id, afsc_program_id, required_hours)
select l.id, a.id, 240
from public.locations l cross join public.afsc_programs a
where l.installation_code = 'KEESLER' and a.code = '4N0'
on conflict (location_id, afsc_program_id) do nothing;
