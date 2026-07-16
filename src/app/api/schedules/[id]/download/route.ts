import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL(`/sign-in?next=/api/schedules/${id}/download`, request.url));

  // RLS on schedule_documents is the authorization check: this select only returns a
  // row if the signed-in user is allowed to see it (their own, their class's, or a
  // program they supervise).
  const { data: document } = await supabase.from("schedule_documents").select("file_path,file_name").eq("id", id).maybeSingle();
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage.from("schedules").createSignedUrl(document.file_path, 60, { download: document.file_name });
  if (error || !signed) return NextResponse.json({ error: error?.message ?? "Unable to generate download link" }, { status: 500 });

  return NextResponse.redirect(signed.signedUrl);
}
