"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, HeartHandshake,
  LayoutDashboard, MapPin, NotebookPen, Stethoscope, UserRound, UsersRound,
} from "lucide-react";

type Role = "Student" | "Preceptor" | "Supervisor";

const roleData = {
  Student: { name: "Jordan Rivera", subtitle: "4N0 Student · Group Alpha", stats: [["Hours complete", "184", "56 remaining"], ["Checklist", "18/24", "75% complete"], ["Next shift", "2 days", "Emergency Services"], ["Kudos sent", "3", "1 pending approval"]] },
  Preceptor: { name: "MSgt Maya Chen", subtitle: "Preceptor · Emergency Services", stats: [["Students assigned", "6", "This rotation"], ["Feedback due", "2", "By Friday"], ["Next shift", "Tomorrow", "07:00–15:00"], ["Kudos received", "12", "3 this month"]] },
  Supervisor: { name: "TSgt Alex Morgan", subtitle: "Phase II Clinical Supervisor", stats: [["Active students", "24", "3 groups"], ["Pending roles", "5", "Needs review"], ["Kudos review", "4", "Awaiting decision"], ["Schedule", "Published", "Through Jul 31"]] },
} as const;

const nav = [
  ["Overview", LayoutDashboard], ["Schedule", CalendarDays], ["Departments", Stethoscope],
  ["Learning hub", BookOpen], ["My notes", NotebookPen], ["Profile", UserRound],
] as const;

const schedule = [
  ["14", "TUE", "Emergency Services", "07:00–15:00 · MSgt Maya Chen"],
  ["16", "THU", "Intensive Care Unit", "07:00–15:00 · Capt Olivia Adams"],
  ["18", "SAT", "Independent study", "08:00–12:00 · Learning Hub"],
];

export function DashboardDemo() {
  const [role, setRole] = useState<Role>("Student");
  const current = roleData[role];
  const initials = current.name.split(" ").map((word) => word[0]).join("").slice(0, 2);

  return <div className="dashboard-shell">
    <aside className="sidebar">
      <Link href="/" className="brand"><span className="brand-mark"><Stethoscope size={19} /></span><span><strong>PhasePrep</strong><small>Navigator</small></span></Link>
      <span className="role-pill">{role} portal</span>
      <nav className="side-nav">{nav.map(([label, Icon], index) => <button className={index === 0 ? "active" : ""} key={label}><Icon size={17} /><span>{label}</span></button>)}{role === "Supervisor" && <button><UsersRound size={17} /><span>People & groups</span></button>}</nav>
      <div className="side-profile"><span className="avatar">{initials}</span><div><strong>{current.name}</strong><small>{role}</small></div></div>
    </aside>

    <section className="dashboard-main">
      <header className="dash-topbar"><span className="location-select"><MapPin size={14} /> Eglin AFB · 4N0</span><div className="role-switch" aria-label="Dashboard preview role">{(["Student", "Preceptor", "Supervisor"] as Role[]).map((item) => <button key={item} onClick={() => setRole(item)} className={role === item ? "active" : ""}>{item}</button>)}</div></header>
      <div className="dash-content">
        <div className="welcome"><div><h1>Welcome back, {current.name.split(" ")[0]}.</h1><p>{current.subtitle}</p></div><span className="date-chip">Friday · July 10, 2026</span></div>
        <div className="stats-grid">{current.stats.map(([label, value, detail]) => <article className="stat-card" key={label}><small>{label}</small><strong>{value}</strong><span>{detail}</span></article>)}</div>
        <div className="dashboard-grid">
          <article className="dash-card"><div className="card-heading"><h2>{role === "Supervisor" ? "Published schedule" : "Your upcoming schedule"}</h2><button>{role === "Supervisor" ? "Open builder" : "View calendar"}</button></div>{schedule.map(([date, day, title, detail], index) => <div className="schedule-item" key={date}><div className="day"><strong>{date}</strong>{day}</div><div><h3>{title}</h3><p>{detail}</p></div><span className="tag">{index === 0 ? "Prepared" : "Upcoming"}</span></div>)}</article>
          <div><article className="dash-card"><div className="card-heading"><h2>{role === "Supervisor" ? "Needs your attention" : "Quick access"}</h2></div>{role === "Supervisor" ? <SupervisorApprovals /> : <QuickAccess role={role} />}</article><div className="notice"><small><CheckCircle2 size={12} /> Training safety</small><p>Use PhasePrep for education and rotation management only. Never enter patient-identifying information in notes or feedback.</p></div></div>
        </div>
      </div>
    </section>
  </div>;
}

function SupervisorApprovals() {
  return <div className="approval-list">{[[HeartHandshake, "4 kudos submissions", "Review before publication"], [UsersRound, "5 role requests", "Student and preceptor access"], [CalendarDays, "Week 4 draft", "Schedule ready to publish"]].map(([Icon, title, detail]) => { const ItemIcon = Icon as typeof HeartHandshake; return <div className="approval" key={title as string}><ItemIcon size={18} /><div><strong>{title as string}</strong><small>{detail as string}</small></div><button>Review</button></div>; })}</div>;
}

function QuickAccess({ role }: { role: Exclude<Role, "Supervisor"> }) {
  return <div className="quick-grid"><div className="quick"><ClipboardCheck /><strong>{role === "Student" ? "My checklist" : "Student feedback"}</strong><span>{role === "Student" ? "6 items remaining" : "2 submissions due"}</span></div><div className="quick"><NotebookPen /><strong>Private notes</strong><span>Only visible to you</span></div><div className="quick"><BookOpen /><strong>Student handbook</strong><span>Current 2026 edition</span></div><div className="quick"><HeartHandshake /><strong>{role === "Student" ? "Send kudos" : "Recognition"}</strong><span>{role === "Student" ? "Recognize a preceptor" : "View approved kudos"}</span></div></div>;
}
