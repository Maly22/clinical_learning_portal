import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  HeartHandshake,
  MapPin,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

const locations = [
  "Wright-Patterson AFB",
  "Travis AFB",
  "Nellis AFB",
  "Eglin AFB",
  "JBSA–Lackland AFB",
];

const features = [
  { icon: CalendarDays, title: "Rotation schedules", copy: "See every shift, department, and preceptor assignment in one clear view." },
  { icon: CheckCircle2, title: "Clinical readiness", copy: "Prepare with guided checklists, trusted resources, and department expectations." },
  { icon: BookOpen, title: "Department learning", copy: "Review workflows, common procedures, equipment, videos, and local guidance." },
  { icon: HeartHandshake, title: "Preceptor recognition", copy: "Celebrate excellent teaching through student-submitted, supervisor-approved kudos." },
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <Link href="/" className="brand" aria-label="PhasePrep Navigator home">
          <span className="brand-mark"><Stethoscope size={20} /></span>
          <span><strong>PhasePrep</strong><small>Navigator</small></span>
        </Link>
        <nav aria-label="Primary navigation">
          <a href="#program">Program</a><a href="#locations">Locations</a><a href="#resources">Resources</a>
        </nav>
        <div className="header-actions"><Link className="text-link" href="/sign-in">Sign in</Link><Link className="button small" href="/sign-up">Create account <ArrowRight size={15}/></Link></div>
      </header>

      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-copy">
          <span className="eyebrow"><ShieldCheck size={14}/> Built for AMSA Phase II training</span>
          <h1>Arrive prepared.<br/><em>Learn with purpose.</em></h1>
          <p>One clinical development platform for 4N0 students, preceptors, and supervisors—across every Phase II location.</p>
          <div className="hero-actions"><Link className="button" href="/sign-up">Start your clinical journey <ArrowRight size={17}/></Link><a className="button ghost" href="#program">See how it works</a></div>
          <div className="trust-row"><span><CheckCircle2/> Department-specific preparation</span><span><CheckCircle2/> Supervisor-approved content</span><span><CheckCircle2/> No patient data</span></div>
        </div>
        <div className="hero-panel" aria-label="Upcoming clinical rotation preview">
          <div className="panel-top"><span>YOUR NEXT ROTATION</span><span className="live-dot">Published</span></div>
          <div className="rotation-date"><strong>14</strong><span>JUL<br/>TUESDAY</span></div>
          <div className="rotation-main"><span className="icon-tile"><Stethoscope/></span><div><small>07:00–15:00</small><h3>Emergency Services</h3><p>Eglin AFB · Group Alpha</p></div></div>
          <div className="preceptor"><span className="avatar">MC</span><div><small>Assigned preceptor</small><strong>MSgt Maya Chen</strong></div><span className="ready">Ready</span></div>
          <div className="prep-progress"><div><span>Preparation checklist</span><strong>4 of 6</strong></div><i><b style={{width:"67%"}}/></i></div>
          <Link href="/dashboard" className="panel-link">Open rotation details <ArrowRight size={15}/></Link>
        </div>
      </section>

      <section className="location-strip" id="locations"><span>Phase II locations</span>{locations.map((location)=><span className="location" key={location}><MapPin size={14}/>{location}</span>)}</section>

      <section className="section" id="program">
        <div className="section-heading"><div><span className="kicker">A clearer path to clinical confidence</span><h2>Everything you need before<br/>you enter the department.</h2></div><p>Foundational guidance complements—not replaces—preceptor instruction and supervised clinical practice.</p></div>
        <div className="feature-grid">{features.map(({icon:Icon,title,copy},index)=><article className="feature-card" key={title}><span className="feature-num">0{index+1}</span><Icon/><h3>{title}</h3><p>{copy}</p><span className="learn">Learn more <ArrowRight size={14}/></span></article>)}</div>
      </section>

      <section className="resource-band" id="resources">
        <div><span className="kicker light">Designed to grow</span><h2>One platform. Every location.<br/>More AFSCs when you’re ready.</h2></div>
        <p>The curriculum is shared where it should be and customized where local workflows matter. Start with 4N0 today without limiting tomorrow.</p>
        <Link href="/dashboard" className="button light">Enter the learning portal <ArrowRight size={16}/></Link>
      </section>

      <footer><div className="brand inverse"><span className="brand-mark"><Stethoscope size={20}/></span><span><strong>PhasePrep</strong><small>Navigator</small></span></div><p>Foundational clinical preparation for AMSA Phase II training.</p><span>Training support only · No PHI</span></footer>
    </main>
  );
}
