import { createClient } from "@/lib/supabase/server";

export async function isUrlSaved(url: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("saved_items").select("id").eq("user_id", user.id).eq("url", url).maybeSingle();
  return Boolean(data);
}
