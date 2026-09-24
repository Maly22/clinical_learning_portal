-- "Help us improve this portal" survey from the site footer. Anyone (signed in or not)
-- can submit; only platform admins can read responses. user_id is a best-effort link
-- for signed-in submitters, mirroring guest kudos (202609240009).
create table public.portal_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  improvement text check (char_length(improvement) <= 2000),
  role text check (role in ('student', 'preceptor', 'supervisor', 'other')),
  page_path text check (char_length(page_path) <= 300),
  created_at timestamptz not null default now()
);

alter table public.portal_feedback enable row level security;

create policy "anyone can submit portal feedback" on public.portal_feedback
for insert to anon with check (user_id is null);
create policy "signed-in users submit portal feedback" on public.portal_feedback
for insert to authenticated with check (user_id is null or user_id = auth.uid());
create policy "platform admins read portal feedback" on public.portal_feedback
for select to authenticated using (
  exists (select 1 from public.memberships m where m.user_id = auth.uid() and m.role = 'platform_admin' and m.is_active)
);

grant insert on public.portal_feedback to anon, authenticated;
grant select on public.portal_feedback to authenticated;
