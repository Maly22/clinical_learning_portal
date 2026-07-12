# Deployment runbook

## 1. Provision isolated resources

Create one hosted Supabase project for Vercel. In Resend, verify the sending domain and create one sending API key. Local development continues to use the local Supabase stack and logged email delivery.

## 2. Link and migrate Supabase

Use the project reference shown in each Supabase project's URL/settings:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push --dry-run
supabase db push
```

Run the dry-run first and review destructive statements. Database migrations should be applied before deploying application code that depends on them. Configure the hosted Auth Site URL to the canonical production URL and add the Vercel preview redirect pattern only to the non-production Supabase project.

## 3. Link Vercel

```bash
vercel login
vercel link
```

Set variables in Vercel using `.env.production.example` as the checklist. Assign the same values to Production and Preview if branch Previews are enabled. Do not configure Vercel's Development scope.

| Variable | Vercel value |
| --- | --- |
| `NEXT_PUBLIC_APP_ENV` | `production` |
| `NEXT_PUBLIC_APP_URL` | canonical URL |
| Supabase URL and keys | hosted project |
| Resend credentials | verified production sender |
| `EMAIL_DELIVERY_MODE` | `send` |
| `EMAIL_TEST_RECIPIENT` | unset |

Never pass secrets as CLI command arguments, where they can enter shell history. Let the CLI prompt for values or manage them in the Vercel dashboard.

## 4. Configure Resend

Verify SPF and DKIM for the sending domain, keep the runtime API key restricted to sending, and set `RESEND_FROM_EMAIL` to an address on that domain. Use a separate full-access management credential to register `/api/webhooks/resend` for email lifecycle events, then retain its signing secret in `RESEND_WEBHOOK_SECRET`. Do not enable Production sending until the domain is verified.

## 5. Validate and deploy

```bash
pnpm install --frozen-lockfile
pnpm check
git push origin your-branch # automatic Preview
git push origin main        # automatic Production
```

Merge to `main` only after checks pass. If branch Previews are enabled, remember they use production-connected services. Confirm `/api/health`, authentication redirects, database access under real user roles, and a controlled transactional email. Roll back application code from Vercel; roll forward database changes with a new migration rather than editing an applied migration.

## Secret rotation

If a service-role key, Resend key, or webhook secret is exposed, revoke it at the provider first, replace it in every Vercel environment, redeploy, and remove it from local files and logs. Git history cleanup does not replace credential rotation.
