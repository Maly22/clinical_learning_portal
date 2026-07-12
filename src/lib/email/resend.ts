import "server-only";
import { Resend } from "resend";
import { getServerEnv } from "@/lib/env";

type Message = { to: string; subject: string; html: string; idempotencyKey: string };

export async function sendTransactionalEmail(message: Message) {
  const env = getServerEnv();
  const destination = env.EMAIL_TEST_RECIPIENT || message.to;
  if (env.EMAIL_DELIVERY_MODE === "log") {
    console.info("Email suppressed in development", { to: destination, subject: message.subject });
    return { id: `suppressed:${message.idempotencyKey}` };
  }
  const resend = new Resend(env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send(
    { from: env.RESEND_FROM_EMAIL, to: destination, subject: message.subject, html: message.html },
    { idempotencyKey: message.idempotencyKey },
  );
  if (error) throw error;
  return data;
}
