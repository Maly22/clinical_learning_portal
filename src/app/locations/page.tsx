import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { listLocations } from "@/lib/data/locations";

export default async function LocationsIndexPage() {
  const locations = await listLocations();

  return (
    <main>
      <SiteHeader />
      <section className="page-hero">
        <div className="hero-glow" />
        <span className="eyebrow"><MapPin size={14} /> Phase II locations</span>
        <h1>Choose your <em>location</em></h1>
        <p>Every site uses the same format — departments, checklists, guides, FAQs, events, and kudos — customized with local content.</p>
      </section>
      <section className="section">
        <div className="location-cards">
          {locations.map((location) => (
            <Link href={`/locations/${location.slug}`} className="location-card" key={location.id}>
              <MapPin size={20} />
              <h3>{location.short_name}</h3>
              <p>{location.name}</p>
              <span className="learn">Enter <ArrowRight size={14} /></span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
