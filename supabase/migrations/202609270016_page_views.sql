-- Anonymous visit counting for Dashboard → Visitors. Each row is one page view: the path,
-- a random per-browser visitor id (generated client-side, not tied to any account or IP),
-- and whether the screen was phone-sized. Anyone may insert; only platform admins can
-- read, and only through the aggregate function below.
create table public.page_views (
  id bigint generated always as identity primary key,
  path text not null check (char_length(path) between 1 and 300),
  visitor_id uuid not null,
  is_mobile boolean not null default false,
  created_at timestamptz not null default now()
);

create index page_views_created_idx on public.page_views (created_at);

alter table public.page_views enable row level security;

create policy "anyone records page views" on public.page_views
for insert to anon, authenticated with check (true);

grant insert on public.page_views to anon, authenticated;

-- Weekly/monthly totals, device split, and top pages, in the portal's time zone.
create or replace function public.visitor_stats(tz text default 'America/Chicago')
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Only platform admins can view visitor stats';
  end if;

  with local as (
    select path, visitor_id, is_mobile, created_at at time zone tz as ts from public.page_views
  ),
  weeks as (
    select to_char(w, 'YYYY-MM-DD') as period, count(l.visitor_id) as views, count(distinct l.visitor_id) as visitors
    from generate_series(date_trunc('week', now() at time zone tz) - interval '11 weeks', date_trunc('week', now() at time zone tz), interval '1 week') w
    left join local l on date_trunc('week', l.ts) = w
    group by w order by w
  ),
  months as (
    select to_char(m, 'YYYY-MM') as period, count(l.visitor_id) as views, count(distinct l.visitor_id) as visitors
    from generate_series(date_trunc('month', now() at time zone tz) - interval '11 months', date_trunc('month', now() at time zone tz), interval '1 month') m
    left join local l on date_trunc('month', l.ts) = m
    group by m order by m
  ),
  top_pages as (
    select path, count(*) as views from local
    where ts >= (now() at time zone tz) - interval '30 days' and path not like '/dashboard%' and path <> '/profile'
    group by path order by views desc limit 8
  )
  select jsonb_build_object(
    'weeks', (select coalesce(jsonb_agg(to_jsonb(weeks)), '[]') from weeks),
    'months', (select coalesce(jsonb_agg(to_jsonb(months)), '[]') from months),
    'top_pages', (select coalesce(jsonb_agg(to_jsonb(top_pages)), '[]') from top_pages),
    'all_time', (select jsonb_build_object('views', count(*), 'visitors', count(distinct visitor_id)) from local),
    'last_30_days', (select jsonb_build_object('views', count(*), 'visitors', count(distinct visitor_id), 'mobile_views', count(*) filter (where is_mobile))
                     from local where ts >= (now() at time zone tz) - interval '30 days'),
    'first_recorded', (select min(created_at) from public.page_views)
  ) into result;
  return result;
end;
$$;

revoke execute on function public.visitor_stats(text) from public, anon;
grant execute on function public.visitor_stats(text) to authenticated;
