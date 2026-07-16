import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, HeartHandshake, HelpCircle, MapPinned, Stethoscope } from "lucide-react";
import { getLocationBySlug } from "@/lib/data/locations";

const links = [
  ["departments", Stethoscope, "Departments", "Rotation areas, procedures, equipment, and welcome videos."],
  ["checklist", CheckCircle2, "Interactive checklist", "Track your Phase II readiness items."],
  ["handbook", BookOpen, "Guides & manuals", "The student handbook and program references."],
  ["faq", HelpCircle, "FAQ", "Answers to common day-one and logistics questions."],
  ["events", CalendarDays, "Events", "Continuing education, workshops, and local activities."],
  ["kudos", HeartHandshake, "Kudos", "Supervisor-approved recognition for great preceptors."],
] as const;

export default async function LocationOverviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getLocationBySlug(slug);
  if (!result) notFound();
  const { location, program } = result;

  return (
    <section className="section">
      <div className="section-heading">
        <div><span className="kicker">{program?.afsc_programs?.code ?? "4N0"} · Phase II</span><h2>Everything you need at<br />{location.short_name}.</h2></div>
        <p>Foundational guidance complements — not replaces — preceptor instruction and supervised clinical practice.</p>
      </div>

      <div className="program-overview-card">
        <span className="kicker">Program overview</span>
        <h3>AMSA Phase II Training</h3>
        <p>AMSA Phase II is designed to facilitate hands-on training and strengthen the clinical skills you learned during tech school. Once the first 2 days of orientation are complete, students spend their remaining time completing clinical rotations across various departments.</p>
        <p>You will be here for <strong>5.5 to 7 weeks</strong> (depending on the METC schedule and holidays). A minimum of <strong>240 hours</strong> is required to graduate.</p>
        <div className="program-overview-grid">
          <div><small>Graduation requirements</small><strong>3</strong><span>Preceptor critiques</span></div>
          <div><small>&nbsp;</small><strong>3</strong><span>Student critiques</span></div>
          <div><small>&nbsp;</small><strong>5</strong><span>Patient assessments</span></div>
          <div><small>&nbsp;</small><strong>2519</strong><span>Checklist completion</span></div>
        </div>
        <Link href="/about" className="learn">Read the full program overview <ArrowRight size={14} /></Link>
      </div>

      <div className="feature-grid">
        {links.map(([path, Icon, title, copy]) => (
          <Link className="feature-card" href={`/locations/${slug}/${path}`} key={path}>
            <Icon />
            <h3>{title}</h3>
            <p>{copy}</p>
            <span className="learn">Open <ArrowRight size={14} /></span>
          </Link>
        ))}
      </div>
      <div className="location-contact-cta">
        <MapPinned size={16} />
        <span>Need to reach someone at {location.short_name}?</span>
        <Link href={`/locations/${slug}/contact`}>View contacts <ArrowRight size={14} /></Link>
      </div>
    </section>
  );
}
