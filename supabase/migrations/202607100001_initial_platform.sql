create extension if not exists pgcrypto;

create type public.app_role as enum ('student', 'preceptor', 'supervisor', 'platform_admin');
create type public.review_status as enum ('pending', 'approved', 'rejected');
create type public.schedule_status as enum ('draft', 'published', 'superseded');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  name text not null,
  short_name text not null,
  slug text not null unique,
  installation_code text not null unique,
  timezone text not null default 'America/Chicago',
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.afsc_programs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.location_programs (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id),
  afsc_program_id uuid not null references public.afsc_programs(id),
  required_hours integer not null default 240 check (required_hours > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (location_id, afsc_program_id)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  display_name text,
  phone text,
  bio text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.role_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  location_program_id uuid not null references public.location_programs(id),
  requested_role public.app_role not null,
  status public.review_status not null default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  location_program_id uuid not null references public.location_programs(id),
  role public.app_role not null,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, location_program_id, role)
);

create table public.department_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  sort_order integer not null default 0
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.department_categories(id),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table public.location_departments (
  id uuid primary key default gen_random_uuid(),
  location_program_id uuid not null references public.location_programs(id),
  department_id uuid not null references public.departments(id),
  display_name text,
  required_hours integer not null default 0 check (required_hours >= 0),
  overview text,
  welcome_video_url text,
  is_active boolean not null default true,
  unique (location_program_id, department_id)
);

create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  location_program_id uuid not null references public.location_programs(id),
  name text not null,
  starts_on date not null,
  ends_on date not null,
  is_active boolean not null default true,
  check (ends_on >= starts_on)
);

create table public.cohort_enrollments (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id),
  student_id uuid not null references public.profiles(id),
  enrolled_at timestamptz not null default now(),
  unique (cohort_id, student_id)
);

create table public.student_groups (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id),
  name text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (cohort_id, name)
);

create table public.student_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.student_groups(id),
  student_id uuid not null references public.profiles(id),
  effective_from date not null default current_date,
  effective_to date,
  unique (group_id, student_id, effective_from)
);

create table public.schedule_versions (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id),
  version_number integer not null,
  status public.schedule_status not null default 'draft',
  published_by uuid references public.profiles(id),
  published_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (cohort_id, version_number)
);

create table public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  schedule_version_id uuid not null references public.schedule_versions(id) on delete cascade,
  location_department_id uuid references public.location_departments(id),
  student_group_id uuid references public.student_groups(id),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  instructions text,
  cancelled_at timestamptz,
  check (ends_at > starts_at)
);

create table public.schedule_entry_students (
  schedule_entry_id uuid not null references public.schedule_entries(id) on delete cascade,
  student_id uuid not null references public.profiles(id),
  primary key (schedule_entry_id, student_id)
);

create table public.schedule_entry_preceptors (
  schedule_entry_id uuid not null references public.schedule_entries(id) on delete cascade,
  preceptor_id uuid not null references public.profiles(id),
  primary key (schedule_entry_id, preceptor_id)
);

create table public.user_notes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id),
  title text not null,
  body text not null,
  location_department_id uuid references public.location_departments(id),
  schedule_entry_id uuid references public.schedule_entries(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.preceptor_feedback (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id),
  preceptor_id uuid not null references public.profiles(id),
  location_department_id uuid not null references public.location_departments(id),
  strengths text,
  development_opportunities text,
  comments text,
  submitted_at timestamptz not null default now(),
  acknowledged_at timestamptz
);

create table public.kudos (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id),
  preceptor_id uuid not null references public.profiles(id),
  location_department_id uuid not null references public.location_departments(id),
  message text not null check (char_length(message) between 10 and 2000),
  display_student_name boolean not null default true,
  status public.review_status not null default 'pending',
  moderated_by uuid references public.profiles(id),
  moderated_at timestamptz,
  moderation_reason text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.learning_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  resource_url text not null,
  resource_type text not null,
  is_free boolean not null default true,
  reviewed_at timestamptz,
  is_active boolean not null default true
);

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  afsc_program_id uuid not null references public.afsc_programs(id),
  title text not null,
  description text,
  resource_id uuid references public.learning_resources(id),
  requirement_type text not null check (requirement_type in ('required','recommended','optional')),
  sort_order integer not null default 0
);

create table public.student_checklist_progress (
  student_id uuid not null references public.profiles(id),
  checklist_item_id uuid not null references public.checklist_items(id),
  completed_at timestamptz,
  primary key (student_id, checklist_item_id)
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index memberships_user_idx on public.memberships(user_id) where is_active;
create index memberships_program_idx on public.memberships(location_program_id) where is_active;
create index schedule_students_idx on public.schedule_entry_students(student_id);
create index schedule_preceptors_idx on public.schedule_entry_preceptors(preceptor_id);
create index kudos_department_status_idx on public.kudos(location_department_id, status);
create index notes_owner_idx on public.user_notes(owner_user_id) where archived_at is null;

create or replace function public.has_program_role(target_program uuid, allowed_roles public.app_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid()
      and m.location_program_id = target_program
      and m.role = any(allowed_roles)
      and m.is_active
  );
$$;

alter table public.profiles enable row level security;
alter table public.role_requests enable row level security;
alter table public.memberships enable row level security;
alter table public.user_notes enable row level security;
alter table public.kudos enable row level security;
alter table public.preceptor_feedback enable row level security;
alter table public.student_checklist_progress enable row level security;

-- Explicitly protect every Data API table. Tables without policies remain server-only
-- until a later migration grants the minimum access required by a feature.
alter table public.organizations enable row level security;
alter table public.locations enable row level security;
alter table public.afsc_programs enable row level security;
alter table public.location_programs enable row level security;
alter table public.department_categories enable row level security;
alter table public.departments enable row level security;
alter table public.location_departments enable row level security;
alter table public.cohorts enable row level security;
alter table public.cohort_enrollments enable row level security;
alter table public.student_groups enable row level security;
alter table public.student_group_members enable row level security;
alter table public.schedule_versions enable row level security;
alter table public.schedule_entries enable row level security;
alter table public.schedule_entry_students enable row level security;
alter table public.schedule_entry_preceptors enable row level security;
alter table public.learning_resources enable row level security;
alter table public.checklist_items enable row level security;
alter table public.audit_events enable row level security;

create policy "users read own profile" on public.profiles for select using (id = auth.uid());
create policy "users update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "users submit role requests" on public.role_requests for insert with check (user_id = auth.uid() and status = 'pending');
create policy "users view own role requests" on public.role_requests for select using (user_id = auth.uid());
create policy "users view own memberships" on public.memberships for select using (user_id = auth.uid());
create policy "private notes owner only" on public.user_notes for all using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy "students submit own kudos" on public.kudos for insert with check (student_id = auth.uid() and status = 'pending');
create policy "students read own kudos" on public.kudos for select using (student_id = auth.uid() or (preceptor_id = auth.uid() and status = 'approved'));
create policy "students read own checklist" on public.student_checklist_progress for select using (student_id = auth.uid());
create policy "students update own checklist" on public.student_checklist_progress for all using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "feedback participants can read" on public.preceptor_feedback for select using (student_id = auth.uid() or preceptor_id = auth.uid());
create policy "preceptors create feedback" on public.preceptor_feedback for insert with check (preceptor_id = auth.uid());

insert into public.organizations (id, name, slug) values ('00000000-0000-0000-0000-000000000001', 'AMSA Phase II', 'amsa-phase-ii');
insert into public.afsc_programs (id, code, name, description) values ('00000000-0000-0000-0000-000000000004', '4N0', 'Aerospace Medical Service', 'Initial AFSC supported by PhasePrep Navigator.');
insert into public.locations (organization_id, name, short_name, slug, installation_code, timezone) values
('00000000-0000-0000-0000-000000000001', 'Wright-Patterson Air Force Base', 'WPAFB', 'wright-patterson-afb', 'WPAFB', 'America/New_York'),
('00000000-0000-0000-0000-000000000001', 'Travis Air Force Base', 'Travis AFB', 'travis-afb', 'TRAVIS', 'America/Los_Angeles'),
('00000000-0000-0000-0000-000000000001', 'Nellis Air Force Base', 'Nellis AFB', 'nellis-afb', 'NELLIS', 'America/Los_Angeles'),
('00000000-0000-0000-0000-000000000001', 'Eglin Air Force Base', 'Eglin AFB', 'eglin-afb', 'EGLIN', 'America/Chicago'),
('00000000-0000-0000-0000-000000000001', 'JBSA–Lackland Air Force Base', 'JBSA–Lackland', 'jbsa-lackland-afb', 'JBSA-LACKLAND', 'America/Chicago');
insert into public.location_programs (location_id, afsc_program_id)
select id, '00000000-0000-0000-0000-000000000004' from public.locations;
insert into public.department_categories (name, slug, sort_order) values
('Outpatient Services', 'outpatient-services', 1), ('Inpatient Services', 'inpatient-services', 2), ('Emergency Services', 'emergency-services', 3);
