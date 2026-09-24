import Link from "next/link";
import { notFound } from "next/navigation";
import { HeartHandshake } from "lucide-react";
import { getLocationBySlug, getLocationKudos } from "@/lib/data/locations";
import { StarRating } from "@/components/kudos/star-rating";

export default async function LocationKudosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getLocationBySlug(slug);
  if (!result) notFound();
  const kudos = result.program ? await getLocationKudos(result.program.id) : [];

  return (
    <section className="section">
      <div className="section-heading">
        <div><span className="kicker">Kudos gallery</span><h2>Recognition at {result.location.short_name}</h2></div>
        <Link href={`/locations/${slug}/kudos/submit`} className="button small"><HeartHandshake size={15} /> Submit kudos</Link>
      </div>
      {!kudos.length && <p className="empty-note">No published kudos yet for {result.location.short_name}.</p>}
      <div className="kudos-cards">
        {kudos.map((item) => (
          <article className="kudos-card" key={item.id}>
            <StarRating rating={item.rating} />
            <strong className="kudos-preceptor">{item.preceptor_name}</strong>
            <p>&ldquo;{item.message}&rdquo;</p>
            <span>— {item.display_student_name && (item.profiles ? `${item.profiles.first_name} ${item.profiles.last_name}` : item.student_name) || "Anonymous student"} · {item.department?.name}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
