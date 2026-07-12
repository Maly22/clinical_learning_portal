import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Resend } from "resend";

import { getServerEnv } from "@/lib/env";

export async function POST(request: NextRequest) {
  const env = getServerEnv();

  if (!env.RESEND_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  }

  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");

  if (!id || !timestamp || !signature) {
    return NextResponse.json({ error: "Missing signature headers" }, { status: 400 });
  }

  try {
    const resend = new Resend(env.RESEND_API_KEY);
    const payload = await request.text();

    resend.webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret: env.RESEND_WEBHOOK_SECRET,
    });

    return new NextResponse(null, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
}
