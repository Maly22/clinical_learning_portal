import { notFound } from "next/navigation";
import { getLocationBySlug } from "@/lib/data/locations";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LocationSubnav } from "./location-subnav";

export default async function LocationLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getLocationBySlug(slug);
  if (!result) notFound();
  const { location } = result;

  return (
    <main className="location-shell">
      <SiteHeader />
      <section className="location-hero">
        <span className="eyebrow">4N0 · Phase II</span>
        <h1>{location.name}</h1>
        <p>Departments, checklists, guides, and recognition — all in one consistent place for {location.short_name}.</p>
      </section>
      <LocationSubnav slug={slug} />
      <div className="location-content">{children}</div>
      <SiteFooter />
    </main>
  );
}
