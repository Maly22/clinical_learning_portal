import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getEvents, getLocationBySlug } from "@/lib/data/locations";

export default async function EventsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getLocationBySlug(slug);
  if (!result) notFound();
  const events = await getEvents(result.location.id);
  const global = events.filter((event) => !event.location_id);
  const local = events.filter((event) => event.location_id);

  return (
    <section className="section">
      <div className="section-heading"><div><span className="kicker">Events</span><h2>Continuing education & activities</h2></div></div>
      {!events.length && <p className="empty-note">No events published yet.</p>}

      {Boolean(global.length) && (
        <div className="event-group">
          <h3>Medical & Military Learning Hubs</h3>
          <div className="event-list">
            {global.map((event) => (
              <a className="event-row" href={event.source_url} target="_blank" rel="noreferrer" key={event.id}>
                <div><strong>{event.name}</strong>{event.description && <p>{event.description}</p>}</div>
                <ExternalLink size={15} />
              </a>
            ))}
          </div>
        </div>
      )}

      {Boolean(local.length) && (
        <div className="event-group">
          <h3>{result.location.short_name} Events & Calendars</h3>
          <div className="event-list">
            {local.map((event) => (
              <a className="event-row" href={event.source_url} target="_blank" rel="noreferrer" key={event.id}>
                <div><strong>{event.name}</strong>{event.description && <p>{event.description}</p>}</div>
                <ExternalLink size={15} />
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
