import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const form = await request.formData();
  const decision = String(form.get("decision"));
  if (decision !== "approve" && decision !== "reject") {
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("moderate_kudos_by_token", { token, approve: decision === "approve", reason: null });

  const outcome = decision === "approve" ? "approved" : "rejected";
  const redirectUrl = new URL(`/kudos-review/${token}`, request.url);
  if (!error) redirectUrl.searchParams.set("done", outcome);
  return NextResponse.redirect(redirectUrl, { status: 303 });
}
