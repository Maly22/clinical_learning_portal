import { notFound } from "next/navigation";
import { getHandbook, getLocationBySlug } from "@/lib/data/locations";
import { SaveButton } from "@/components/saved/save-button";
import { isUrlSaved } from "@/lib/data/saved";
import { RichText } from "@/components/handbook/rich-text";

export default async function HandbookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getLocationBySlug(slug);
  if (!result) notFound();
  const afscCode = result.program?.afsc_programs?.code ?? "4N0";
  const handbook = await getHandbook(result.location.id, afscCode);
  const pageUrl = `/locations/${slug}/handbook`;
  const saved = await isUrlSaved(pageUrl);

  const sections = [...(handbook?.handbook_sections ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const groups = new Map<string, typeof sections>();
  for (const section of sections) {
    const key = section.section_group ?? section.heading;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(section);
  }

  return (
    <section className="section">
      <div className="section-heading">
        <div><span className="kicker">Guides & manuals</span><h2>{handbook?.title ?? "Student handbook"}</h2></div>
        <div className="page-actions">{handbook && <p>{handbook.version_label}</p>}<SaveButton url={pageUrl} title={`${handbook?.title ?? "Student handbook"} · ${result.location.short_name}`} kind="handbook" initialSaved={saved} /></div>
      </div>
      {!handbook && <p className="empty-note">A handbook for {result.location.short_name} is coming soon.</p>}
      <div className="handbook-groups">
        {[...groups.entries()].map(([groupName, groupSections]) => (
          <div className="handbook-group" key={groupName}>
            <h2>{groupName}</h2>
            <div className="handbook-sections">
              {groupSections.map((section) => (
                <article className="handbook-section" key={section.id}>
                  {section.heading !== groupName && <h3>{section.heading}</h3>}
                  {section.body && <RichText text={section.body} />}
                  {section.table_data && (
                    <div className="handbook-table-wrap">
                      <table className="handbook-table">
                        <thead><tr>{section.table_data.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
                        <tbody>{section.table_data.rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
                      </table>
                    </div>
                  )}
                  {Boolean(section.handbook_section_images?.length) && (
                    <div className="handbook-images">
                      {section.handbook_section_images.sort((a, b) => a.sort_order - b.sort_order).map((image) => (
                        <figure key={image.id}>
                          <a href={image.image_url} target="_blank" rel="noreferrer" title="Open full-size image">
                            <img src={image.image_url} alt={image.caption ?? ""} />
                          </a>
                          {image.caption && <figcaption>{image.caption}</figcaption>}
                        </figure>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
