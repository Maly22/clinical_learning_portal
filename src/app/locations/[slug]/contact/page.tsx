import { notFound } from "next/navigation";
import { Mail, Phone } from "lucide-react";
import { getContacts, getLocationBySlug } from "@/lib/data/locations";

export default async function ContactPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getLocationBySlug(slug);
  if (!result) notFound();
  const contacts = await getContacts(result.location.id);

  return (
    <section className="section">
      <div className="section-heading"><div><span className="kicker">Contact</span><h2>Reach the {result.location.short_name} team</h2></div></div>
      {!contacts.length && <p className="empty-note">No contacts published yet.</p>}
      <div className="contact-cards">
        {contacts.map((contact) => (
          <article className="contact-card" key={contact.id}>
            <h3>{contact.display_name}</h3>
            {contact.title && <p>{contact.title}</p>}
            {contact.email && <a href={`mailto:${contact.email}`}><Mail size={14} /> {contact.email}</a>}
            {contact.phone && <a href={`tel:${contact.phone}`}><Phone size={14} /> {contact.phone}</a>}
          </article>
        ))}
      </div>
    </section>
  );
}
