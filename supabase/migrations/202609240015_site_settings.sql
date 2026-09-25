-- Site-wide settings editable by platform admins from Dashboard → Edit content → Site,
-- starting with the "See how it works" video so it can be swapped without a deploy.
create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  value text,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

create policy "public reads site settings" on public.site_settings
for select to anon, authenticated using (true);
create policy "platform admins update site settings" on public.site_settings
for update to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

grant select on public.site_settings to anon, authenticated;
grant update (value, updated_at) on public.site_settings to authenticated;

-- Empty value = the built-in walkthrough bundled with the site (/videos/how-it-works.mp4).
insert into public.site_settings (key, label, value)
values ('how_it_works_video_url', '“See how it works” video', null)
on conflict (key) do nothing;
