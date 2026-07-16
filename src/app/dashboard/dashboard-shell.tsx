import Link from "next/link";
import {
  CalendarDays, ClipboardCheck, ClipboardList, HeartHandshake, LayoutDashboard,
  LogOut, MapPin, NotebookPen, Stethoscope, UserRound, UsersRound,
} from "lucide-react";
import type { CurrentMembership, DashboardRole } from "@/lib/data/dashboard";

const ROLE_LABEL: Record<DashboardRole, string> = {
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
      notes,
    ] as const;
  }
  if (role === "preceptor") {
    return [home, profile, ["/dashboard/checklists", ClipboardList, "Student Checklists"], ["/dashboard/kudos", HeartHandshake, "Kudos Received"], notes] as const;
  }
  return [home, profile, ["/dashboard/schedule", CalendarDays, "Schedule"], [`/locations/${locationSlug}/kudos/submit`, HeartHandshake, "Submit Kudos"], notes] as const;
}

export function DashboardShell({ membership, activeHref, children }: { membership: CurrentMembership; activeHref: string; children: React.ReactNode }) {
  const nav = navFor(membership.role, membership.locationSlug);
  const initials = `${membership.firstName[0] ?? ""}${membership.lastName[0] ?? ""}`.toUpperCase();

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
        <div className="side-profile"><span className="avatar">{initials}</span><div><strong>{membership.firstName} {membership.lastName}</strong><small>{ROLE_LABEL[membership.role]}</small></div></div>
      </aside>
      <section className="dashboard-main">
        <header className="dash-topbar"><span className="location-select"><MapPin size={14} /> {membership.locationName || "—"} · {membership.afscCode}</span></header>
        <div className="dash-content">{children}</div>
      </section>
    </div>
  );
}
