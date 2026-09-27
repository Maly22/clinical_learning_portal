import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/data/dashboard";
import { DashboardShell } from "../dashboard-shell";

type Period = { period: string; views: number; visitors: number };
type Stats = {
  weeks: Period[];
  months: Period[];
  top_pages: Array<{ path: string; views: number }>;
  all_time: { views: number; visitors: number };
  last_30_days: { views: number; visitors: number; mobile_views: number };
  first_recorded: string | null;
};

const fmt = (n: number) => new Intl.NumberFormat("en-US", { notation: n >= 10000 ? "compact" : "standard" }).format(n);

function periodLabel(period: string, view: "week" | "month", short = false) {
  if (view === "month") {
    const [y, m] = period.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "short", year: short ? undefined : "numeric", timeZone: "UTC" });
  }
  const [y, m, d] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

const PAGE_NAMES: Record<string, string> = { "/": "Home page", "/about": "About", "/locations": "Choose a location", "/sign-in": "Sign in", "/sign-up": "Sign up" };
function pageName(path: string) {
  if (PAGE_NAMES[path]) return PAGE_NAMES[path];
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "locations" && parts[1]) {
    const place = parts[1].replace(/-/g, " ").replace(/\bafb\b/i, "AFB").replace(/\b\w/g, (c) => c.toUpperCase());
    const rest = parts.slice(2).map((p) => p.replace(/-/g, " ")).join(" › ");
    return rest ? `${place} › ${rest}` : place;
  }
  return path;
}

export default async function VisitorsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/pending-approval");
  if (membership.role !== "platform_admin") redirect("/dashboard");

  const { view: requested } = await searchParams;
  const view: "week" | "month" = requested === "month" ? "month" : "week";

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("visitor_stats");
  const stats = data as Stats | null;

  const series = (view === "week" ? stats?.weeks : stats?.months) ?? [];
  // Compare the last *complete* period with the one before it; the current period is still in progress.
  const current = series.at(-1);
  const lastFull = series.at(-2);
  const beforeThat = series.at(-3);
  const max = Math.max(1, ...series.map((p) => p.views));
  const thisWeek = stats?.weeks.at(-1);
  const thisMonth = stats?.months.at(-1);
  const mobileShare = stats && stats.last_30_days.views ? Math.round((stats.last_30_days.mobile_views / stats.last_30_days.views) * 100) : null;
  const delta = lastFull && beforeThat && beforeThat.views ? Math.round(((lastFull.views - beforeThat.views) / beforeThat.views) * 100) : null;

  return (
    <DashboardShell membership={membership} activeHref="/dashboard/visitors">
      <div className="approval-page-head">
        <span className="eyebrow">Admin tools</span>
        <h1>Visitors</h1>
        <p>
          How many people visit the portal. Counts are anonymous — no names or accounts are recorded.
          {stats?.first_recorded && <> Counting since {new Date(stats.first_recorded).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.</>}
        </p>
      </div>

      {error || !stats ? (
        <section className="queue-card"><div className="queue-empty">Visitor numbers aren&apos;t available right now.</div></section>
      ) : (
        <>
          <div className="visitor-tiles">
            <div className="stat-card"><small>This week</small><strong>{fmt(thisWeek?.views ?? 0)}</strong><span>visits · {fmt(thisWeek?.visitors ?? 0)} people</span></div>
            <div className="stat-card"><small>This month</small><strong>{fmt(thisMonth?.views ?? 0)}</strong><span>visits · {fmt(thisMonth?.visitors ?? 0)} people</span></div>
            <div className="stat-card"><small>Last 30 days on phones</small><strong>{mobileShare === null ? "—" : `${mobileShare}%`}</strong><span>of {fmt(stats.last_30_days.views)} visits</span></div>
            <div className="stat-card"><small>All time</small><strong>{fmt(stats.all_time.views)}</strong><span>visits · {fmt(stats.all_time.visitors)} people</span></div>
          </div>

          <section className="queue-card visitor-chart-card">
            <div className="visitor-chart-head">
              <div>
                <h2>Visits per {view}</h2>
                <p>
                  {lastFull ? <>Last {view}: <b>{fmt(lastFull.views)}</b> visits</> : null}
                  {delta !== null && <> ({delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% vs the {view} before)</>}
                  {current ? <> · This {view} so far: <b>{fmt(current.views)}</b></> : null}
                </p>
              </div>
              <nav className="visitor-toggle" aria-label="Group by">
                <Link href="/dashboard/visitors?view=week" className={view === "week" ? "active" : ""}>Weekly</Link>
                <Link href="/dashboard/visitors?view=month" className={view === "month" ? "active" : ""}>Monthly</Link>
              </nav>
            </div>

            <div className="visitor-chart" role="img" aria-label={`Bar chart of visits per ${view} for the last ${series.length} ${view}s`}>
              {series.map((p, i) => {
                const isCurrent = i === series.length - 1;
                return (
                  <div className="visitor-col" key={p.period} tabIndex={0}>
                    <span className="visitor-tip">
                      <b>{view === "week" ? `Week of ${periodLabel(p.period, view)}` : periodLabel(p.period, view)}{isCurrent ? " (so far)" : ""}</b>
                      {fmt(p.views)} visits · {fmt(p.visitors)} people
                    </span>
                    <span className="visitor-bar-area">
                      {isCurrent && <span className="visitor-value">{fmt(p.views)}</span>}
                      <span className={`visitor-bar${isCurrent ? " current" : ""}`} style={{ height: `${Math.max(p.views ? 3 : 0, (p.views / max) * 100)}%` }} />
                    </span>
                    <span className="visitor-axis">{periodLabel(p.period, view, true)}</span>
                  </div>
                );
              })}
            </div>
            <p className="visitor-note">The last bar is the current {view}, still in progress. Tap or hover a bar for details.</p>

            <details className="visitor-table">
              <summary>Show as a table</summary>
              <table>
                <thead><tr><th>{view === "week" ? "Week of" : "Month"}</th><th>Visits</th><th>People</th></tr></thead>
                <tbody>
                  {[...series].reverse().map((p) => (
                    <tr key={p.period}><td>{periodLabel(p.period, view)}</td><td>{fmt(p.views)}</td><td>{fmt(p.visitors)}</td></tr>
                  ))}
                </tbody>
              </table>
            </details>
          </section>

          <section className="queue-card visitor-pages">
            <h2>Most visited pages <small>last 30 days</small></h2>
            {stats.top_pages.length ? (
              <ol>
                {stats.top_pages.map((page) => (
                  <li key={page.path}>
                    <Link href={page.path} target="_blank">{pageName(page.path)}</Link>
                    <span>{fmt(page.views)}</span>
                  </li>
                ))}
              </ol>
            ) : <div className="queue-empty">No visits recorded yet.</div>}
          </section>
        </>
      )}
    </DashboardShell>
  );
}
