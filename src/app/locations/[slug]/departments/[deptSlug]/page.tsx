import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ClipboardCheck, HeartHandshake, PlayCircle, Video } from "lucide-react";
import { getDepartmentDetail, getDepartmentSkills, getLocationBySlug } from "@/lib/data/locations";
import { StarRating } from "@/components/kudos/star-rating";
import { SaveButton } from "@/components/saved/save-button";
import { isUrlSaved } from "@/lib/data/saved";
import { createClient } from "@/lib/supabase/server";

export default async function DepartmentDetailPage({ params }: { params: Promise<{ slug: string; deptSlug: string }> }) {
  const { slug, deptSlug } = await params;
  const result = await getLocationBySlug(slug);
  if (!result?.program) notFound();
  const detail = await getDepartmentDetail(result.program.id, deptSlug);
  if (!detail) notFound();
  const { locationDepartment, procedures, kudos } = detail;
  const departmentName = locationDepartment.display_name || locationDepartment.departments.name;
  const pageUrl = `/locations/${slug}/departments/${deptSlug}`;
  const saved = await isUrlSaved(pageUrl);
  const skills = await getDepartmentSkills(result.program.afsc_programs?.code ?? "4N0", departmentName);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <section className="section department-detail">
      <div className="section-heading">
        <div><span className="kicker">{result.location.short_name}</span><h2>{departmentName}</h2></div>
        <div className="page-actions">
          <SaveButton url={pageUrl} title={`${departmentName} · ${result.location.short_name}`} kind="department" initialSaved={saved} />
          <Link href={`/locations/${slug}/kudos/submit?department=${locationDepartment.id}`} className="button small"><HeartHandshake size={15} /> Submit kudos</Link>
        </div>
      </div>

      <div className="department-video">
        {locationDepartment.welcome_video_url ? (
          <iframe src={locationDepartment.welcome_video_url} title="Department welcome video" allowFullScreen />
        ) : (
          <div className="department-video-placeholder"><Video size={22} /><span>Welcome video coming soon</span></div>
        )}
      </div>

      <div className="department-overview-grid">
        <p className="department-overview">{locationDepartment.overview || locationDepartment.departments.description}</p>
        <aside className="department-facts">
          <div><small>Required hours</small><strong>{locationDepartment.required_hours || "—"}</strong></div>
          <div><small>Procedures</small><strong>{procedures.length}</strong></div>
          <div><small>Kudos published</small><strong>{kudos.length}</strong></div>
        </aside>
      </div>

      {!procedures.length && <p className="empty-note">Procedure content for this department is coming soon.</p>}
      {procedures.map((procedure) => (
        <article className="procedure-card" key={procedure.id}>
          <h3>{procedure.external_resource_url ? <a href={procedure.external_resource_url} target="_blank" rel="noreferrer">{procedure.name}</a> : procedure.name}</h3>
          {procedure.what_it_is && <p><strong>What it is:</strong> {procedure.what_it_is}</p>}
          {procedure.why_it_is_used && <p><strong>Why it&apos;s used:</strong> {procedure.why_it_is_used}</p>}
          {procedure.how_it_works && <p><strong>How it works:</strong> {procedure.how_it_works}</p>}
          {procedure.student_learning_objectives && <p><strong>Learning objectives:</strong> {procedure.student_learning_objectives}</p>}
          {procedure.equipment && <p><strong>Equipment:</strong> {procedure.equipment}</p>}
          {procedure.video_url && <a href={procedure.video_url} target="_blank" rel="noreferrer" className="learn"><PlayCircle size={14} /> Watch demonstration</a>}
        </article>
      ))}

      <div className="department-skills">
        <div className="card-heading">
          <h2>Skills you can practice in this department</h2>
          {user && <Link href={`/locations/${slug}/checklist`}>View in my checklist <ArrowRight size={13} /></Link>}
        </div>
        {!skills.length && <p className="empty-note">No checklist skills are mapped to this department yet.</p>}
        <div className="checklist-list">
          {skills.map((skill) => <div className="checklist-row skill-row" key={skill.id}><ClipboardCheck size={16} /><div><strong>{skill.title}</strong></div></div>)}
        </div>
        {!user && Boolean(skills.length) && <p className="skill-signin-hint">Sign in to track and sign off these skills in your own checklist.</p>}
      </div>

      <div className="kudos-gallery">
        <div className="card-heading"><h2>Kudos for this department</h2><Link href={`/locations/${slug}/kudos/submit?department=${locationDepartment.id}`}>Recognize a preceptor <ArrowRight size={13} /></Link></div>
        {!kudos.length && <p className="empty-note">No published kudos yet for this department.</p>}
        <div className="kudos-cards">
          {kudos.map((item) => (
            <article className="kudos-card" key={item.id}>
              <StarRating rating={item.rating} />
              <strong className="kudos-preceptor">{item.preceptor_name}</strong>
              <p>&ldquo;{item.message}&rdquo;</p>
              <span>— {item.display_student_name && item.profiles ? `${item.profiles.first_name} ${item.profiles.last_name}` : "Anonymous student"}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
