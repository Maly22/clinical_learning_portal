import Link from "next/link";
import { FeedbackButton } from "@/components/feedback/feedback-button";
import {
  BarChart3, CalendarDays, ClipboardCheck, ClipboardList, FilePenLine, HeartHandshake, LayoutDashboard,
  LogOut, MapPin, Menu, MessageSquareHeart, NotebookPen, Stethoscope, UserRound, UsersRound,
} from "lucide-react";
import type { CurrentMembership, DashboardRole } from "@/lib/data/dashboard";

export const ROLE_LABEL: Record<DashboardRole, string> = {
  platform_admin: "Platform admin",
  supervisor: "Supervisor",
  preceptor: "Preceptor",
  student: "Student",
};

function navFor(role: DashboardRole, locationSlug: string) {
  const home = ["/dashboard", LayoutDashboard, "Home"] as const;
  const notes = ["/dashboard/notes", NotebookPen, "Notes"] as const;
  const profile = ["/profile", UserRound, "Profile"] as const;
  if (role === "supervisor" || role === "platform_admin") {
    return [
      home,
      ["/dashboard/approvals", ClipboardCheck, "Pending Users"],
      ["/dashboard/users", UsersRound, "Manage Users"],
      ["/dashboard/schedules", CalendarDays, "Assign Schedules"],
      ["/dashboard/students", Stethoscope, "Student List"],
      ["/dashboard/kudos", HeartHandshake, "Kudos Review"],
      ["/dashboard/content", FilePenLine, "Edit Content"],
      ...(role === "platform_admin" ? [["/dashboard/feedback", MessageSquareHeart, "Feedback"] as const, ["/dashboard/visitors", BarChart3, "Visitors"] as const] : []),
      notes,
    ] as const;
  }
  if (role === "preceptor") {
    return [home, profile, ["/dashboard/checklists", ClipboardList, "Student Checklists"], ["/dashboard/kudos", HeartHandshake, "Kudos Received"], notes] as const;
  }
  return [home, profile, ["/dashboard/schedule", CalendarDays, "Schedule"], [`/locations/${locationSlug}/kudos/submit`, HeartHandshake, "Submit Kudos"], notes] as const;
}

/** Short labels for the phone bottom bar, where space is tight. */
const SHORT_LABEL: Record<string, string> = {
  "Pending Users": "Pending", "Manage Users": "Users", "Assign Schedules": "Schedules", "Student List": "Students",
  "Kudos Review": "Kudos", "Edit Content": "Content", "Student Checklists": "Checklists", "Kudos Received": "Kudos", "Submit Kudos": "Kudos",
};

/** Staff get their most-used pages in the phone bar; everyone else gets the first four. */
const STAFF_PRIMARY = ["/dashboard", "/dashboard/approvals", "/dashboard/kudos", "/dashboard/content"];

export function DashboardShell({ membership, activeHref, children }: { membership: CurrentMembership; activeHref: string; children: React.ReactNode }) {
  const nav = navFor(membership.role, membership.locationSlug);
  const initials = `${membership.firstName[0] ?? ""}${membership.lastName[0] ?? ""}`.toUpperCase();
  const isStaff = membership.role === "supervisor" || membership.role === "platform_admin";
  const primary = isStaff ? nav.filter(([href]) => STAFF_PRIMARY.includes(href)) : nav.slice(0, 4);
  const more = nav.filter((item) => !primary.includes(item));
  const moreActive = more.some(([href]) => href === activeHref) || (isStaff && activeHref === "/profile");

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <Link href="/" className="brand"><span className="brand-mark"><Stethoscope size={19} /></span><span><strong>PhasePrep</strong><small>Navigator</small></span></Link>
        <span className="role-pill">{ROLE_LABEL[membership.role]} portal</span>
        <nav className="side-nav">
          {nav.map(([href, Icon, label]) => (
            <Link href={href} key={label} className={href === activeHref ? "active" : ""}><Icon size={17} /><span>{label}</span></Link>
          ))}
          <form action="/auth/sign-out" method="post"><button type="submit"><LogOut size={17} /><span>Log out</span></button></form>
        </nav>
        {/* Phone-only bottom bar: four main pages plus a "More" sheet with everything else. */}
        <nav className="mobile-nav" aria-label="Dashboard">
          {primary.map(([href, Icon, label]) => (
            <Link href={href} key={label} className={href === activeHref ? "active" : ""}><Icon size={19} /><span>{SHORT_LABEL[label] ?? label}</span></Link>
          ))}
          <details className="mobile-more">
            <summary className={moreActive ? "active" : ""}><Menu size={19} /><span>More</span></summary>
            <div className="mobile-more-sheet">
              <div className="mobile-more-head"><span className="avatar">{initials}</span><div><strong>{membership.firstName} {membership.lastName}</strong><small>{ROLE_LABEL[membership.role]} · {membership.locationName}</small></div></div>
              {more.map(([href, Icon, label]) => (
                <Link href={href} key={label} className={href === activeHref ? "active" : ""}><Icon size={18} /><span>{label}</span></Link>
              ))}
              {isStaff && <Link href="/profile" className={activeHref === "/profile" ? "active" : ""}><UserRound size={18} /><span>Profile</span></Link>}
              <form action="/auth/sign-out" method="post"><button type="submit"><LogOut size={18} /><span>Log out</span></button></form>
            </div>
          </details>
        </nav>
        <div className="side-profile"><span className="avatar">{initials}</span><div><strong>{membership.firstName} {membership.lastName}</strong><small>{ROLE_LABEL[membership.role]}</small></div></div>
      </aside>
      <section className="dashboard-main">
        <header className="dash-topbar"><Link href="/" className="dash-topbar-brand" aria-label="PhasePrep home"><Stethoscope size={16} /></Link><span className="location-select"><MapPin size={14} /> {membership.locationName || "—"} · {membership.afscCode}</span></header>
        <div className="dash-content">{children}<div className="dash-feedback"><FeedbackButton className="feedback-trigger dark" /></div></div>
      </section>
    </div>
  );
}
