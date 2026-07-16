import { notFound, redirect } from "next/navigation";
import { getLocationBySlug, getLocationDepartments } from "@/lib/data/locations";
import { createClient } from "@/lib/supabase/server";
import { KudosForm } from "./kudos-form";

export default async function SubmitKudosPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ department?: string }> }) {
  const { slug } = await params;
  const { department } = await searchParams;
  const result = await getLocationBySlug(slug);
  if (!result?.program) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/locations/${slug}/kudos/submit`);

  const departments = await getLocationDepartments(result.program.id);

  return (
    <section className="section">
      <div className="section-heading"><div><span className="kicker">Recognition</span><h2>Submit kudos at {result.location.short_name}</h2></div><p>Your kudos is reviewed by a supervisor before it&apos;s published to the department gallery.</p></div>
      <KudosForm
        departments={departments.map((item) => ({ id: item.id, name: item.display_name || item.departments?.name || "Department" }))}
        defaultDepartmentId={department}
      />
    </section>
  );
}
