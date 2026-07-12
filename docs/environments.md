# Environment strategy

## Development

- Local Next.js reads `.env.local`, which is ignored by Git, and uses the local stack from `supabase start`.
- Run Next locally with `pnpm dev`, or run the built app with `pnpm build && pnpm start`.
- There is no Vercel Development environment to configure.
- `EMAIL_DELIVERY_MODE=log` suppresses outbound email by default.

## Vercel

- Vercel uses one Supabase project and one Resend configuration.
- The `main` branch is the Production branch.
- Optional branch Preview deployments reuse the same Vercel configuration; treat them as production-connected.
- Production uses `EMAIL_DELIVERY_MODE=send` with a verified Resend sending domain.
- Service-role and Resend keys are server-only and must never use a `NEXT_PUBLIC_` prefix.

## Free-tier model

- Local development uses the local Supabase stack; Vercel uses one hosted Supabase project.
- Free Supabase projects can pause after inactivity.
- Suppress development email to preserve Resend's quota and prevent accidental delivery.
- Assign the same cloud variables to Vercel Preview and Production when branch Previews are enabled.

If a server-side secret is printed, committed, or shared, rotate it immediately and update every affected environment.
