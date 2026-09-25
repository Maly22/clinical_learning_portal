import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  HeartHandshake,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ImageSlider } from "@/components/image-slider";
import { HowItWorksVideo } from "@/components/how-it-works-video";
import { createClient } from "@/lib/supabase/server";

const CDN = "https://cdn.prod.website-files.com/6a1b2afe6f5ec901d7298573";

const features = [
  { icon: CalendarDays, title: "Rotation schedules", copy: "See every shift, department, and preceptor assignment in one clear view." },
  { icon: CheckCircle2, title: "Clinical readiness", copy: "Prepare with guided checklists, trusted resources, and department expectations." },
  { icon: BookOpen, title: "Department learning", copy: "Review workflows, common procedures, equipment, videos, and local guidance." },
  { icon: HeartHandshake, title: "Preceptor recognition", copy: "Celebrate excellent teaching through student-submitted, supervisor-approved kudos." },
];

export default async function Home() {
  const supabase = await createClient();
  const { data: locations } = await supabase
    .from("locations")
    .select("short_name,slug")
    .eq("is_active", true)
    .order("short_name");
  const { data: videoSetting } = await supabase.from("site_settings").select("value").eq("key", "how_it_works_video_url").maybeSingle();

  return (
    <main>
      <SiteHeader />

      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-copy">
          <span className="eyebrow"><ShieldCheck size={14}/> Built for AMSA Phase II training</span>
          <h1>Arrive prepared.<br/><em>Learn with purpose.</em></h1>
          <p>One clinical development platform for 4N0 students, preceptors, and supervisors—across every Phase II location.</p>
          {/* Sign-up CTA hidden while piloting without public account creation; restore the /sign-up Link to bring it back. */}
          <div className="hero-actions"><HowItWorksVideo url={videoSetting?.value ?? null} /></div>
          <div className="trust-row"><span><CheckCircle2/> Department-specific preparation</span><span><CheckCircle2/> Supervisor-approved content</span><span><CheckCircle2/> No patient data</span></div>
        </div>
        <div className="hero-image-wrapper"><img src={`${CDN}/6a1bc34fa8018a51046ad0ab_Picture1.png`} alt="" className="hero-image" /></div>
      </section>

      <section className="slider-section"><ImageSlider images={[`${CDN}/6a209c08b13f97771fb78f33_h2.jpg`, `${CDN}/6a209c2da48b608d2180370c_h1.avif`]} /></section>

      <section className="location-strip" id="locations"><span>Phase II locations</span>{(locations??[]).map((location)=><Link className="location" href={`/locations/${location.slug}`} key={location.slug}><MapPin size={14}/>{location.short_name}</Link>)}</section>

      <section className="section" id="program">
        <div className="section-heading"><div><span className="kicker">A clearer path to clinical confidence</span><h2>Everything you need before<br/>you enter the department.</h2></div><p>Foundational guidance complements—not replaces—preceptor instruction and supervised clinical practice.</p></div>
        <div className="feature-grid">{features.map(({icon:Icon,title,copy},index)=><article className="feature-card" key={title}><span className="feature-num">0{index+1}</span><Icon/><h3>{title}</h3><p>{copy}</p><span className="learn">Learn more <ArrowRight size={14}/></span></article>)}</div>
      </section>

      <section className="resource-band" id="resources">
        <div><span className="kicker light">Designed to grow</span><h2>One platform. Every location.<br/>More AFSCs when you’re ready.</h2></div>
        <p>The curriculum is shared where it should be and customized where local workflows matter. Start with 4N0 today without limiting tomorrow.</p>
        <Link href="/dashboard" className="button light">Enter the learning portal <ArrowRight size={16}/></Link>
      </section>

      <SiteFooter />
    </main>
  );
}
