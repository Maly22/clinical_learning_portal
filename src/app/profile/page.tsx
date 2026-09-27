import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/data/dashboard";
import { SavedList } from "@/components/saved/saved-list";
import { DashboardShell, ROLE_LABEL } from "../dashboard/dashboard-shell";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/profile");

  const membership = await getCurrentMembership();
  if (!membership) redirect("/pending-approval");

  const { data: profile } = await supabase.from("profiles").select("first_name,last_name,display_name,phone,bio").eq("id", user.id).single();
  const { data: saved } = await supabase.from("saved_items").select("id,url,title,kind").eq("user_id", user.id).order("created_at", { ascending: false });

  return (
    <DashboardShell membership={membership} activeHref="/profile">
      <div className="profile-page in-dashboard">
        <div className="profile-card">
          <span className="eyebrow">My profile</span>
          <h1>{profile?.display_name || `${profile?.first_name} ${profile?.last_name}`}</h1>
          <p>{user.email}</p>
          <div className="profile-grid">
            <div><small>Role</small><strong>{ROLE_LABEL[membership.role]}</strong></div>
            <div><small>Program</small><strong>{membership.afscCode} · Phase II{membership.locationName ? ` · ${membership.locationName}` : ""}</strong></div>
            <div><small>Phone</small><strong>{profile?.phone || "Not provided"}</strong></div>
            <div><small>About</small><strong>{profile?.bio || "Add a short professional introduction."}</strong></div>
          </div>
        </div>
        <div className="profile-card saved-card">
          <span className="eyebrow">My saved material</span>
          <h2>Quick access to what you&apos;ve saved</h2>
          <SavedList initialItems={(saved ?? []) as never[]} />
        </div>
      </div>
    </DashboardShell>
  );
}
