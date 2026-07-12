# Environment strategy

## Development and Preview

- Local Next.js reads `.env.local`, which is ignored by Git, and uses the local stack from `supabase start`.
- Vercel Preview uses a dedicated non-production hosted Supabase project; it never connects to a developer's local stack.
- `EMAIL_DELIVERY_MODE=log` suppresses outbound email by default.
- For intentional email tests, set `EMAIL_DELIVERY_MODE=send` and `EMAIL_TEST_RECIPIENT` so every message is redirected to one controlled inbox.

## Production

- Vercel Production uses a separate production Supabase project.
- Production uses `EMAIL_DELIVERY_MODE=send` with a verified Resend sending domain.
- Service-role and Resend keys are server-only and must never use a `NEXT_PUBLIC_` prefix.

## Free-tier model

- Reserve Supabase's two active free projects for development/preview and production.
- Free Supabase projects can pause after inactivity.
- Suppress development email to preserve Resend's quota and prevent accidental delivery.
- Scope Vercel variables separately to Development, Preview, and Production.

If a server-side secret is printed, committed, or shared, rotate it immediately and update every affected environment.
