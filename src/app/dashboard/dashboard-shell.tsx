import Link from "next/link";
import { FeedbackButton } from "@/components/feedback/feedback-button";
import { GuidedTour, type TourStep } from "@/components/guided-tour";
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

/** The supervisor/admin walkthrough: each step highlights a real button (`data-tour`). */
function staffTour(role: DashboardRole): TourStep[] {
  const admin = role === "platform_admin";
  return [
    { title: admin ? "Welcome to your admin dashboard" : "Welcome to your supervisor dashboard", body: "This quick tour shows where everything is and what each button does. It takes about a minute. Use Next and Back, or your keyboard arrows." },
    { target: "/dashboard", title: "Home", body: "Your starting point. It shows what needs your attention at your location and shortcuts to common tasks." },
    { target: "stats", title: "At a glance", body: "Pending role requests, pending kudos, and how many members are active at your location. If a number isn't zero, something is waiting for you." },
    { target: "/dashboard/approvals", title: "Pending Users", body: "People who signed up and are waiting for access. Check their requested role and location, then approve (✓) or reject (✕)." },
    { target: "/dashboard/users", title: "Manage Users", body: admin ? "Invite new people by email, and see everyone with access to your location. As platform admin, you can change anyone's role here — including handing admin over to someone else." : "Invite new people by email, and see everyone with active access to your location, with their email and role." },
    { target: "/dashboard/schedules", title: "Assign Schedules", body: "Create classes, enroll students, and upload the schedule each student or class should see in their dashboard." },
    { target: "/dashboard/students", title: "Student List", body: "Every student at your location: their class, whether a schedule is uploaded, and how many notes you have on them. Open one to see details." },
    { target: "/dashboard/kudos", title: "Kudos Review", body: "Recognition that students submit about preceptors waits here. Approve it to publish on the department page, or reject it." },
    { target: "/dashboard/content", title: "Edit Content", body: "Update what students see — handbook, FAQs, departments, procedures, contacts, and events. Saved changes go live right away." },
    ...(admin ? [
      { target: "/dashboard/feedback", title: "Feedback", body: "Answers to the “Help us improve this portal” survey, with ratings and comments you can filter by role." },
      { target: "/dashboard/visitors", title: "Visitors", body: "How many people visit the portal each week and month, and which pages are most popular." },
    ] : []),
    { target: "/dashboard/notes", title: "Notes", body: "Private notes that only you can see — handy for reminders and follow-ups." },
    { target: "feedback-button", title: "Help us improve", body: "Found a problem or have an idea? Send quick feedback from the bottom of any page." },
    { target: "logout", title: "Log out", body: "Sign out when you're done, especially on a shared computer." },
    { title: "You're all set!", body: "You can replay this tour anytime with the “Take the tour” button on your dashboard home." },
  ];
}

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
            <Link href={href} key={label} data-tour={href} className={href === activeHref ? "active" : ""}><Icon size={17} /><span>{label}</span></Link>
          ))}
          <form action="/auth/sign-out" method="post"><button type="submit" data-tour="logout"><LogOut size={17} /><span>Log out</span></button></form>
        </nav>
        {/* Phone-only bottom bar: four main pages plus a "More" sheet with everything else. */}
        <nav className="mobile-nav" aria-label="Dashboard">
          {primary.map(([href, Icon, label]) => (
            <Link href={href} key={label} data-tour={href} className={href === activeHref ? "active" : ""}><Icon size={19} /><span>{SHORT_LABEL[label] ?? label}</span></Link>
          ))}
          <details className="mobile-more">
            <summary data-tour="more" className={moreActive ? "active" : ""}><Menu size={19} /><span>More</span></summary>
            <div className="mobile-more-sheet">
              <div className="mobile-more-head"><span className="avatar">{initials}</span><div><strong>{membership.firstName} {membership.lastName}</strong><small>{ROLE_LABEL[membership.role]} · {membership.locationName}</small></div></div>
              {more.map(([href, Icon, label]) => (
                <Link href={href} key={label} data-tour={href} className={href === activeHref ? "active" : ""}><Icon size={18} /><span>{label}</span></Link>
              ))}
              {isStaff && <Link href="/profile" className={activeHref === "/profile" ? "active" : ""}><UserRound size={18} /><span>Profile</span></Link>}
              <form action="/auth/sign-out" method="post"><button type="submit" data-tour="logout"><LogOut size={18} /><span>Log out</span></button></form>
            </div>
          </details>
        </nav>
        <div className="side-profile"><span className="avatar">{initials}</span><div><strong>{membership.firstName} {membership.lastName}</strong><small>{ROLE_LABEL[membership.role]}</small></div></div>
      </aside>
      <section className="dashboard-main">
        <header className="dash-topbar"><Link href="/" className="dash-topbar-brand" aria-label="PhasePrep home"><Stethoscope size={16} /></Link><span className="location-select"><MapPin size={14} /> {membership.locationName || "—"} · {membership.afscCode}</span></header>
        <div className="dash-content">{children}<div className="dash-feedback" data-tour="feedback-button"><FeedbackButton className="feedback-trigger dark" /></div></div>
        {isStaff && activeHref === "/dashboard" && <GuidedTour steps={staffTour(membership.role)} storageKey={`pp_tour_${membership.role}_v1`} />}
      </section>
    </div>
  );
}
