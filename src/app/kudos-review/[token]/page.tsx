import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ShieldCheck, Stethoscope, XCircle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { StarRating } from "@/components/kudos/star-rating";

export const metadata = { robots: "noindex" };

export default async function KudosReviewPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ done?: string }> }) {
  const { token } = await params;
  const { done } = await searchParams;
  const admin = createAdminClient();
  const { data: kudos } = await admin
    .from("kudos")
    .select("id,message,rating,status,preceptor_name,student_name,student:profiles!kudos_student_id_fkey(first_name,last_name),location_departments(departments(name),location_programs(locations(name)))")
    .eq("decision_token", token)
    .maybeSingle();
  if (!kudos) notFound();

  const student = kudos.student as unknown as { first_name: string; last_name: string } | null;
  const locationDepartment = kudos.location_departments as unknown as { departments: { name: string } | null; location_programs: { locations: { name: string } | null } | null } | null;

  return (
    <main className="pending-page">
      <Link href="/" className="brand"><span className="brand-mark"><Stethoscope size={20} /></span><span><strong>PhasePrep</strong><small>Navigator</small></span></Link>
      <section className="pending-card kudos-review-card">
        <span className="pending-icon"><ShieldCheck /></span>
        <span className="eyebrow">Kudos review</span>
        <h1>{kudos.preceptor_name}</h1>
        <p>Submitted by {student ? `${student.first_name} ${student.last_name}` : kudos.student_name || "a guest submitter"} · {locationDepartment?.departments?.name} · {locationDepartment?.location_programs?.locations?.name}</p>
        <StarRating rating={kudos.rating} size={20} />
        <blockquote>&ldquo;{kudos.message}&rdquo;</blockquote>

        {kudos.status !== "pending" && !done && <div className="form-success">This kudos was already {kudos.status}. No further action is needed.</div>}
        {kudos.status === "pending" && !done && (
          <div className="kudos-review-actions">
            <form action={`/api/kudos-review/${token}`} method="post">
              <input type="hidden" name="decision" value="approve" />
              <button className="button approve-button"><CheckCircle2 size={16} /> Approve</button>
            </form>
            <form action={`/api/kudos-review/${token}`} method="post">
              <input type="hidden" name="decision" value="reject" />
              <button className="button ghost-dark reject"><XCircle size={16} /> Reject</button>
            </form>
          </div>
        )}
        {done && <div className="form-success">Kudos {done}. Thank you for reviewing.</div>}
      </section>
    </main>
  );
}
