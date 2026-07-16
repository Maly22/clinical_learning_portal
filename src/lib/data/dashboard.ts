import { createClient } from "@/lib/supabase/server";

const ROLE_PRIORITY = ["platform_admin", "supervisor", "preceptor", "student"] as const;
export type DashboardRole = (typeof ROLE_PRIORITY)[number];

export type CurrentMembership = {
  userId: string;
  email: string | null;
  firstName: string;
  lastName: string;
  role: DashboardRole;
  locationProgramId: string;
  locationName: string;
  locationSlug: string;
  afscCode: string;
};

export async function getCurrentMembership(): Promise<CurrentMembership | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: memberships } = await supabase
    .from("memberships")
    .select("role,location_program_id,location_programs(locations(name,slug),afsc_programs(code))")
    .eq("user_id", user.id)
    .eq("is_active", true);
  if (!memberships?.length) return null;

  const best = [...memberships].sort(
    (a, b) => ROLE_PRIORITY.indexOf(a.role as DashboardRole) - ROLE_PRIORITY.indexOf(b.role as DashboardRole),
  )[0];
  const program = best.location_programs as unknown as { locations: { name: string; slug: string } | null; afsc_programs: { code: string } | null } | null;

  const { data: profile } = await supabase.from("profiles").select("first_name,last_name").eq("id", user.id).single();

  return {
    userId: user.id,
    email: user.email ?? null,
    firstName: profile?.first_name ?? "",
    lastName: profile?.last_name ?? "",
    role: best.role as DashboardRole,
    locationProgramId: best.location_program_id,
    locationName: program?.locations?.name ?? "",
    locationSlug: program?.locations?.slug ?? "",
    afscCode: program?.afsc_programs?.code ?? "4N0",
  };
}
