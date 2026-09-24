import Link from "next/link";
import {
  ArrowRight, BarChart3, Compass, Gauge, LineChart, MapPin,
  Repeat, ShieldCheck, Sparkles, Target,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const pillars = [
  { icon: ShieldCheck, title: "Prepare", copy: "PhasePrep Navigator equips you with the knowledge and confidence you need before entering any clinical department. From expectations to workflows, you'll understand what's ahead so you can focus on learning — not guessing." },
  { icon: Compass, title: "Learn", copy: "Access clear, structured learning tools designed to support your Phase II clinical training. Explore procedures, watch demonstrations, review checklists, and study department-specific workflows — all organized to help you learn efficiently and confidently." },
  { icon: Target, title: "Excel", copy: "Track your progress, strengthen your clinical judgment, and build the confidence needed to excel in every department. Excellence isn't accidental — it's built through preparation, practice, and purpose." },
];

const requirements = [
  ["3", "Preceptor critiques"],
  ["3", "Student critiques"],
  ["5", "Patient assessments"],
  ["2519", "Checklist completion"],
];

const hours = [
  ["14 hrs", "Orientation"],
  ["48 hrs", "Emergency Department"],
  ["86 hrs", "Outpatient clinics"],
  ["96 hrs", "Inpatient units"],
];

const features = [
  { icon: Sparkles, title: "Interactive learning", copy: "Explore interactive videos and checklists designed for clinical readiness." },
  { icon: Target, title: "Tailored recommendations", copy: "Get recommendations tailored to your department and skill level." },
  { icon: LineChart, title: "Progress tracking", copy: "See your milestones and receive feedback from instructors." },
  { icon: Repeat, title: "Guided practice", copy: "Build confidence with guided skill practice and assessments." },
  { icon: Gauge, title: "Self-paced learning", copy: "Select your focus area and learn at your own speed." },
  { icon: BarChart3, title: "Performance insights", copy: "Visualize achievements and discover what to focus on next." },
];

export default function AboutPage() {
  return (
    <main>
      <SiteHeader />

      <section className="page-hero">
        <div className="hero-glow" />
        <span className="eyebrow"><ShieldCheck size={14} /> How it works</span>
        <h1>About PhasePrep <em>Navigator</em></h1>
        <p>Discover tools designed to help you succeed in AMSA Phase II — from department overviews to procedures, checklists, and documentation basics.</p>
      </section>

      <section className="section">
        <div className="section-heading">
          <div><span className="kicker">Program overview</span><h2>AMSA Phase II Training</h2></div>
          <p>AMSA Phase II is designed to facilitate hands-on training and strengthen the clinical skills you learned during tech school. Once the first two days of orientation are complete, students spend their remaining time completing clinical rotations across various departments.</p>
        </div>
        <div className="pillars-grid">{pillars.map(({ icon: Icon, title, copy }) => <article className="pillar-card" key={title}><Icon /><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>

      <section className="section requirements-section">
        <div className="section-heading">
          <div><span className="kicker">Timeline</span><h2>5.5 to 7 weeks.<br />240 hours minimum.</h2></div>
          <p>Exact length depends on the METC schedule and holidays. All students must complete these requirements by the time the End of Course is reached.</p>
        </div>
        <div className="stats-grid">{requirements.map(([value, label]) => <article className="stat-card" key={label}><small>{label}</small><strong>{value}</strong></article>)}</div>
        <h3 className="hours-heading">Clinical hours breakdown <span>example schedule, Eglin AFB — hours vary by location</span></h3>
        <div className="stats-grid">{hours.map(([value, label]) => <article className="stat-card" key={label}><small>{label}</small><strong>{value}</strong></article>)}</div>
      </section>

      <section className="section">
        <div className="section-heading"><div><span className="kicker">Features</span><h2>Unlock smart clinical learning.</h2></div><p>Everything you need to succeed, in one place.</p></div>
        <div className="feature-grid">{features.map(({ icon: Icon, title, copy }, index) => <article className="feature-card" key={title}><span className="feature-num">0{index + 1}</span><Icon /><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>

      <section className="resource-band">
        <div><span className="kicker light">Choose your location</span><h2>Every Phase II site.<br />One consistent experience.</h2></div>
        <p>Departments, checklists, handbooks, FAQs, events, and kudos — organized the same way at every location.</p>
        <Link href="/locations" className="button light">Explore locations <MapPin size={16} /><ArrowRight size={16} /></Link>
      </section>

      <SiteFooter />
    </main>
  );
}
