# Deployment runbook

## 1. Provision isolated resources

Create separate Supabase projects for non-production and production. In Resend, verify the production sending domain and create separate API keys for non-production and production. Do not reuse production service-role credentials in Preview or Development.

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

Set variables with `vercel env add NAME development|preview|production`, using the values documented in the committed `.env.*.example` files. Scope them as follows:

| Variable | Development | Preview | Production |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_ENV` | `development` | `preview` | `production` |
| `NEXT_PUBLIC_APP_URL` | local URL | deployment URL policy | canonical URL |
| Supabase URL/publishable key | non-production | non-production | production |
| Supabase service-role key | non-production | non-production | production |
| Resend credentials | test/non-production | test/non-production | production |
| `EMAIL_DELIVERY_MODE` | `log` | `log` | `send` |
| `EMAIL_TEST_RECIPIENT` | controlled inbox | controlled inbox | unset |

Never pass secrets as CLI command arguments, where they can enter shell history. Let the CLI prompt for values, or manage them in the Vercel dashboard. After configuration, pull only Development values locally:

```bash
pnpm env:pull
```

## 4. Configure Resend

Verify SPF and DKIM for the sending domain, create an API key restricted to sending access, and set `RESEND_FROM_EMAIL` to an address on that domain. Configure a webhook endpoint only when the application has a verified webhook handler; retain `RESEND_WEBHOOK_SECRET` for signature validation. Do not enable Production sending until the domain is verified.

## 5. Validate and deploy

```bash
pnpm install --frozen-lockfile
pnpm check
vercel deploy
vercel deploy --prod
```

Promote only after the Preview deployment passes smoke tests. Confirm `/api/health`, authentication redirects, database access under real user roles, and a controlled transactional email. Roll back application code from Vercel; roll forward database changes with a new migration rather than editing an applied migration.

## Secret rotation

If a service-role key, Resend key, or webhook secret is exposed, revoke it at the provider first, replace it in every Vercel environment, redeploy, and remove it from local files and logs. Git history cleanup does not replace credential rotation.
