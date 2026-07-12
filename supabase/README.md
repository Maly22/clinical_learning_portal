# PhasePrep Supabase foundation

The initial migration establishes the multi-location, multi-AFSC data model and seeds the five requested Phase II locations with 4N0 enabled.

Apply migrations through the Supabase CLI after linking a project. All user-facing tables must retain Row Level Security. Service-role credentials are server-only and must never use a `NEXT_PUBLIC_` prefix.

The current UI uses representative data until Supabase environment variables are provided. The next implementation slice will connect authentication, role approval, schedules, notes, feedback, checklists, and kudos moderation to these tables.
