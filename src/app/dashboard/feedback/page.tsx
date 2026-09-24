import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/data/dashboard";
import { StarRating } from "@/components/kudos/star-rating";
import { DashboardShell } from "../dashboard-shell";

const ROLE_FILTERS = [
  ["all", "All"],
  ["student", "Students"],
  ["preceptor", "Preceptors"],
  ["supervisor", "Supervisors"],
  ["other", "Other"],
  ["none", "Not given"],
] as const;

const ROLE_LABEL: Record<string, string> = { student: "Student", preceptor: "Preceptor", supervisor: "Supervisor", other: "Other" };

function isWithinDays(iso: string, days: number) {
  return Date.now() - new Date(iso).getTime() < days * 24 * 60 * 60 * 1000;
}

type Feedback = { id: string; rating: number; improvement: string | null; role: string | null; page_path: string | null; created_at: string };

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ role?: string; comments?: string }> }) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/pending-approval");
  if (membership.role !== "platform_admin") redirect("/dashboard");

  const { role: requestedRole, comments } = await searchParams;
  const roleFilter = ROLE_FILTERS.some(([key]) => key === requestedRole) ? requestedRole! : "all";
  const commentsOnly = comments === "1";

  const supabase = await createClient();
  const { data } = await supabase
    .from("portal_feedback")
    .select("id,rating,improvement,role,page_path,created_at")
    .order("created_at", { ascending: false })
    .limit(1000);
  const all = (data ?? []) as Feedback[];

  const filtered = all
    .filter((item) => roleFilter === "all" || (roleFilter === "none" ? !item.role : item.role === roleFilter))
    .filter((item) => !commentsOnly || item.improvement);

  const scored = all.filter((item) => roleFilter === "all" || (roleFilter === "none" ? !item.role : item.role === roleFilter));
  const average = scored.length ? scored.reduce((sum, item) => sum + item.rating, 0) / scored.length : 0;
  const withComments = scored.filter((item) => item.improvement).length;
  const lastWeek = scored.filter((item) => isWithinDays(item.created_at, 7)).length;
  const distribution = [5, 4, 3, 2, 1].map((value) => ({ value, count: scored.filter((item) => item.rating === value).length }));
  const maxCount = Math.max(1, ...distribution.map((row) => row.count));

  const href = (next: { role?: string; comments?: boolean }) => {
    const params = new URLSearchParams();
    const nextRole = next.role ?? roleFilter;
    if (nextRole !== "all") params.set("role", nextRole);
    if (next.comments ?? commentsOnly) params.set("comments", "1");
    const query = params.toString();
    return `/dashboard/feedback${query ? `?${query}` : ""}`;
  };

  return (
    <DashboardShell membership={membership} activeHref="/dashboard/feedback">
      <div className="approval-page-head">
        <span className="eyebrow">Admin tools</span>
        <h1>Portal feedback</h1>
        <p>Responses to “Help us improve this portal” from every page and location.</p>
      </div>

      <div className="feedback-stats">
        <div className="stat-card"><small>Average rating</small><strong>{scored.length ? average.toFixed(1) : "—"}</strong>{scored.length > 0 && <StarRating rating={Math.round(average)} />}</div>
        <div className="stat-card"><small>Responses</small><strong>{scored.length}</strong><span>{lastWeek} in the last 7 days</span></div>
        <div className="stat-card"><small>With a comment</small><strong>{withComments}</strong></div>
        <div className="stat-card feedback-distribution">
          <small>Ratings</small>
          {distribution.map((row) => (
            <div className="feedback-bar" key={row.value}>
              <span>{row.value}</span>
              <div><i style={{ width: `${(row.count / maxCount) * 100}%` }} /></div>
              <b>{row.count}</b>
            </div>
          ))}
        </div>
      </div>

      <nav className="content-tabs">
        {ROLE_FILTERS.map(([key, label]) => <Link key={key} href={href({ role: key })} className={key === roleFilter ? "active" : ""}>{label}</Link>)}
        <Link href={href({ comments: !commentsOnly })} className={`feedback-toggle${commentsOnly ? " active" : ""}`}>{commentsOnly ? "✓ " : ""}Only with comments</Link>
      </nav>

      <section className="queue-card feedback-list">
        {filtered.map((item) => (
          <article className="feedback-row" key={item.id}>
            <div className="feedback-row-head">
              <StarRating rating={item.rating} />
              <span className="tag">{item.role ? ROLE_LABEL[item.role] ?? item.role : "Role not given"}</span>
              <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</time>
            </div>
            {item.improvement ? <p>{item.improvement}</p> : <p className="feedback-no-comment">No comment, rating only.</p>}
            {item.page_path && <small>Sent from <Link href={item.page_path} target="_blank">{item.page_path}</Link></small>}
          </article>
        ))}
        {!filtered.length && <div className="queue-empty">No feedback yet{roleFilter !== "all" || commentsOnly ? " for this filter" : ""}.</div>}
      </section>
    </DashboardShell>
  );
}
