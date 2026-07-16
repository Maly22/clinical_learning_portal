import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const form = await request.formData();
  const locationProgramId = String(form.get("location_program_id") || "");
  const cohortId = form.get("cohort_id") ? String(form.get("cohort_id")) : null;
  const studentId = form.get("student_id") ? String(form.get("student_id")) : null;
  const title = String(form.get("title") || "");
  const file = form.get("file");

  if (!locationProgramId || (!cohortId && !studentId) || !title || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data: isSupervisor } = await supabase.rpc("has_program_role", {
    target_program: locationProgramId,
    allowed_roles: ["supervisor", "platform_admin"],
  });
  if (!isSupervisor) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const admin = createAdminClient();
  const path = `${locationProgramId}/${crypto.randomUUID()}-${file.name}`;
  const { error: uploadError } = await admin.storage.from("schedules").upload(path, await file.arrayBuffer(), { contentType: file.type || "application/octet-stream" });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { error: insertError } = await admin.from("schedule_documents").insert({
    location_program_id: locationProgramId,
    cohort_id: cohortId,
    student_id: studentId,
    title,
    file_path: path,
    file_name: file.name,
    mime_type: file.type || "application/octet-stream",
    uploaded_by: user.id,
  });
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
