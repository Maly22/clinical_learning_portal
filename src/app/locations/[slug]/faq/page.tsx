import { notFound } from "next/navigation";
import { getFaqs, getLocationBySlug } from "@/lib/data/locations";
import { RichText } from "@/components/handbook/rich-text";

export default async function FaqPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getLocationBySlug(slug);
  if (!result) notFound();
  const faqs = await getFaqs(result.location.id);

  return (
    <section className="section">
      <div className="section-heading"><div><span className="kicker">FAQ</span><h2>Common questions at {result.location.short_name}</h2></div></div>
      {!faqs.length && <p className="empty-note">No FAQs published for {result.location.short_name} yet.</p>}
      <div className="faq-list">
        {faqs.map((faq) => (
          <details className="faq-item" key={faq.id}>
            <summary>{faq.question}</summary>
            <RichText text={faq.answer} />
          </details>
        ))}
      </div>
    </section>
  );
}
