-- Follow-up fixes from user feedback: free-text preceptor name on kudos (with
-- best-effort auto-match to a registered preceptor account), a distinct
-- "watch demonstration" video link on procedures, a real clinical skills checklist
-- with eligible departments, handbook section images, and a saved-items feature.

-- Students should be able to type a preceptor's name directly instead of picking from
-- a dropdown of registered accounts (many preceptors on a given shift may not have
-- app accounts at all). preceptor_id becomes an optional best-effort link.
alter table public.kudos alter column preceptor_id drop not null;
alter table public.kudos add column preceptor_name text;
update public.kudos set preceptor_name = '' where preceptor_name is null;
alter table public.kudos alter column preceptor_name set not null;

-- Best-effort match so a preceptor who does have an account still sees the kudos
-- under "Kudos Received" without the student having to find/select them. Security
-- definer so it can read memberships/profiles beyond what the submitting student's own
-- RLS would allow, without opening a new broad read policy for this narrow purpose.
create or replace function public.match_kudos_preceptor()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  matched uuid;
  program_id uuid;
begin
  if new.preceptor_id is null and new.preceptor_name is not null then
    select ld.location_program_id into program_id
    from public.location_departments ld where ld.id = new.location_department_id;

    select m.user_id into matched
    from public.memberships m
    join public.profiles p on p.id = m.user_id
    where m.location_program_id = program_id
      and m.role = 'preceptor' and m.is_active
      and lower(trim(p.first_name || ' ' || p.last_name)) = lower(trim(new.preceptor_name))
    limit 1;

    if matched is not null then
      new.preceptor_id := matched;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_kudos_match_preceptor on public.kudos;
create trigger on_kudos_match_preceptor
before insert on public.kudos
for each row execute procedure public.match_kudos_preceptor();

-- Procedure title links to a general reference/learn-more resource (external_resource_url,
-- unchanged); "watch demonstration" now links to an actual how-to video specifically.
alter table public.department_procedures add column video_url text;

-- Real clinical skills checklist (distinct from the free learning-resource checklist):
-- eligible_departments is deliberately a plain readable list rather than a many-to-many
-- join table, since it's presentational guidance ("where can I get this signed off"),
-- not a hard eligibility rule the app enforces.
alter table public.checklist_items add column eligible_departments text;
alter table public.checklist_items add column skill_group text;

-- Handbook sections can carry reference photos (e.g. uniform standards).
create table public.handbook_section_images (
  id uuid primary key default gen_random_uuid(),
  handbook_section_id uuid not null references public.handbook_sections(id) on delete cascade,
  image_url text not null,
  caption text,
  sort_order integer not null default 0
);

alter table public.handbook_section_images enable row level security;

create policy "public reads handbook section images" on public.handbook_section_images
for select to anon, authenticated using (
  exists (
    select 1 from public.handbook_sections hs
    join public.handbooks h on h.id = hs.handbook_id
    where hs.id = handbook_section_images.handbook_section_id and h.status = 'published'
  )
);

grant select on public.handbook_section_images to anon, authenticated;

-- Saved items: a signed-in user can bookmark a page/resource and find it again from
-- their profile instead of navigating back to look for it.
create table public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  url text not null,
  title text not null,
  kind text not null default 'link',
  created_at timestamptz not null default now(),
  unique (user_id, url)
);

alter table public.saved_items enable row level security;

create policy "users manage own saved items" on public.saved_items
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, delete on public.saved_items to authenticated;
