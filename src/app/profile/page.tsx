import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SavedList } from "@/components/saved/saved-list";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/profile");

  const { data: profile } = await supabase.from("profiles").select("first_name,last_name,display_name,phone,bio").eq("id", user.id).single();
  const { data: membership } = await supabase.from("memberships").select("role,location_programs(locations(name),afsc_programs(code,name))").eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!membership) redirect("/pending-approval");

  const { data: saved } = await supabase.from("saved_items").select("id,url,title,kind").eq("user_id", user.id).order("created_at", { ascending: false });

  return (
    <main className="profile-page">
      <div className="profile-card">
        <span className="eyebrow">My profile</span>
        <h1>{profile?.display_name || `${profile?.first_name} ${profile?.last_name}`}</h1>
        <p>{user.email}</p>
        <div className="profile-grid">
          <div><small>Role</small><strong>{membership.role}</strong></div>
          <div><small>Program</small><strong>4N0 · Phase II</strong></div>
          <div><small>Phone</small><strong>{profile?.phone || "Not provided"}</strong></div>
          <div><small>About</small><strong>{profile?.bio || "Add a short professional introduction."}</strong></div>
        </div>
      </div>
      <div className="profile-card saved-card">
        <span className="eyebrow">My saved material</span>
        <h2>Quick access to what you&apos;ve saved</h2>
        <SavedList initialItems={(saved ?? []) as never[]} />
      </div>
    </main>
  );
}
