create type public.publication_status as enum ('draft', 'published', 'archived');

create table public.department_procedures (
  id uuid primary key default gen_random_uuid(),
  location_department_id uuid not null references public.location_departments(id) on delete cascade,
  name text not null,
  slug text not null,
  what_it_is text,
  why_it_is_used text,
  how_it_works text,
  student_learning_objectives text,
  equipment text,
  external_resource_url text,
  sort_order integer not null default 0,
  status public.publication_status not null default 'draft',
  reviewed_at timestamptz,
  unique (location_department_id, slug)
);

create table public.handbooks (
  id uuid primary key default gen_random_uuid(),
  afsc_program_id uuid not null references public.afsc_programs(id),
  location_id uuid references public.locations(id),
  title text not null,
  slug text not null,
  version_label text not null,
  effective_from date,
  status public.publication_status not null default 'draft',
  unique (afsc_program_id, location_id, slug, version_label)
);

create table public.handbook_sections (
  id uuid primary key default gen_random_uuid(),
  handbook_id uuid not null references public.handbooks(id) on delete cascade,
  heading text not null,
  body text,
  sort_order integer not null default 0,
  unique (handbook_id, sort_order)
);

create table public.event_sources (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references public.locations(id),
  name text not null,
  description text,
  source_type text not null check (source_type in ('external_link', 'ical', 'rss', 'manual')),
  source_url text not null,
  audience text not null default 'all',
  is_active boolean not null default true,
  unique (location_id, name)
);

create table public.location_contacts (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  display_name text not null,
  title text,
  email text,
  phone text,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  unique (location_id, display_name, title)
);

alter table public.department_procedures enable row level security;
alter table public.handbooks enable row level security;
alter table public.handbook_sections enable row level security;
alter table public.event_sources enable row level security;
alter table public.location_contacts enable row level security;

create policy "authenticated users read published procedures"
on public.department_procedures for select to authenticated
using (status = 'published');

create policy "authenticated users read published handbooks"
on public.handbooks for select to authenticated
using (status = 'published');

create policy "authenticated users read published handbook sections"
on public.handbook_sections for select to authenticated
using (exists (
  select 1 from public.handbooks h
  where h.id = handbook_id and h.status = 'published'
));

create policy "authenticated users read active event sources"
on public.event_sources for select to authenticated
using (is_active);

create policy "authenticated users read active contacts"
on public.location_contacts for select to authenticated
using (is_active);
