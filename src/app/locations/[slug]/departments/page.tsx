import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getLocationBySlug, getLocationDepartments } from "@/lib/data/locations";

export default async function DepartmentsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getLocationBySlug(slug);
  if (!result) notFound();
  const departments = result.program ? await getLocationDepartments(result.program.id) : [];

  const categories = new Map<string, { name: string; sortOrder: number; items: typeof departments }>();
  for (const item of departments) {
    const category = item.departments?.department_categories;
    const key = category?.slug ?? "other";
    if (!categories.has(key)) categories.set(key, { name: category?.name ?? "Other", sortOrder: category?.sort_order ?? 99, items: [] });
    categories.get(key)!.items.push(item);
  }
  const grouped = [...categories.values()].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <section className="section">
      <div className="section-heading"><div><span className="kicker">Choose your department</span><h2>Departments at {result.location.short_name}</h2></div></div>
      {!grouped.length && <p className="empty-note">Department content for {result.location.short_name} is coming soon.</p>}
      {grouped.map((category) => (
        <div className="department-category" key={category.name}>
          <h3>{category.name}</h3>
          <div className="department-cards">
            {category.items.map((item) => (
              <Link className="department-card" href={`/locations/${slug}/departments/${item.departments?.slug}`} key={item.id}>
                <h4>{item.display_name || item.departments?.name}</h4>
                <p>{item.overview ? `${item.overview.slice(0, 110)}${item.overview.length > 110 ? "…" : ""}` : item.departments?.description}</p>
                <span className="learn">Enter <ArrowRight size={14} /></span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
