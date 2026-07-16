import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getLocationBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data: location } = await supabase
    .from("locations")
    .select("id,name,short_name,slug,timezone")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!location) return null;

  const { data: program } = await supabase
    .from("location_programs")
    .select("id,required_hours,afsc_programs(code,name)")
    .eq("location_id", location.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  return { location, program: program as unknown as { id: string; required_hours: number; afsc_programs: { code: string; name: string } | null } | null };
});

export const listLocations = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("locations").select("id,name,short_name,slug").eq("is_active", true).order("short_name");
  return data ?? [];
});

export const getLocationDepartments = cache(async (locationProgramId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("location_departments")
    .select("id,display_name,required_hours,overview,is_active,departments(name,slug,description,department_categories(name,slug,sort_order))")
    .eq("location_program_id", locationProgramId)
    .eq("is_active", true);
  return (data ?? []) as unknown as Array<{
    id: string; display_name: string | null; required_hours: number; overview: string | null;
    departments: { name: string; slug: string; description: string | null; department_categories: { name: string; slug: string; sort_order: number } | null } | null;
  }>;
});

export const getDepartmentDetail = cache(async (locationProgramId: string, deptSlug: string) => {
  const supabase = await createClient();
  const { data: locationDepartment } = await supabase
    .from("location_departments")
    .select("id,display_name,required_hours,overview,welcome_video_url,departments!inner(name,slug,description)")
    .eq("location_program_id", locationProgramId)
    .eq("departments.slug", deptSlug)
    .eq("is_active", true)
    .maybeSingle();
  if (!locationDepartment) return null;

  const { data: procedures } = await supabase
    .from("department_procedures")
    .select("id,name,slug,what_it_is,why_it_is_used,how_it_works,student_learning_objectives,equipment,external_resource_url,video_url")
    .eq("location_department_id", locationDepartment.id)
    .eq("status", "published")
    .order("sort_order");

  const { data: kudos } = await supabase
    .from("kudos")
    .select("id,message,rating,display_student_name,published_at,preceptor_name,profiles!kudos_student_id_fkey(first_name,last_name)")
    .eq("location_department_id", locationDepartment.id)
    .eq("status", "approved")
    .order("published_at", { ascending: false });

  return {
    locationDepartment: locationDepartment as unknown as { id: string; display_name: string | null; required_hours: number; overview: string | null; welcome_video_url: string | null; departments: { name: string; slug: string; description: string | null } },
    procedures: procedures ?? [],
    kudos: (kudos ?? []) as unknown as Array<{ id: string; message: string; rating: number; display_student_name: boolean; published_at: string; preceptor_name: string; profiles: { first_name: string; last_name: string } | null }>,
  };
});

export const getChecklist = cache(async (afscCode: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("checklist_items")
    .select("id,title,description,requirement_type,sort_order,eligible_departments,skill_group,learning_resources(title,resource_url,resource_type),afsc_programs!inner(code)")
    .eq("afsc_programs.code", afscCode)
    .order("sort_order");
  return (data ?? []) as unknown as Array<{
    id: string; title: string; description: string | null; requirement_type: string; eligible_departments: string | null; skill_group: string | null;
    learning_resources: { title: string; resource_url: string; resource_type: string } | null;
  }>;
});

export const getDepartmentSkills = cache(async (afscCode: string, departmentName: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("checklist_items")
    .select("id,title,skill_group,sort_order,afsc_programs!inner(code)")
    .eq("afsc_programs.code", afscCode)
    .not("eligible_departments", "is", null)
    .ilike("eligible_departments", `%${departmentName}%`)
    .order("sort_order");
  return (data ?? []) as unknown as Array<{ id: string; title: string; skill_group: string | null }>;
});

type HandbookSection = {
  id: string; heading: string; body: string | null; sort_order: number; section_group: string | null; table_data: { headers: string[]; rows: string[][] } | null;
  handbook_section_images: Array<{ id: string; image_url: string; caption: string | null; sort_order: number }>;
};
type Handbook = { id: string; title: string; version_label: string; handbook_sections: HandbookSection[] };

const HANDBOOK_SECTION_COLUMNS = "id,heading,body,sort_order,section_group,table_data,handbook_section_images(id,image_url,caption,sort_order)";

export const getHandbook = cache(async (locationId: string, afscCode: string) => {
  const supabase = await createClient();
  const { data: byLocation } = await supabase
    .from("handbooks")
    .select(`id,title,version_label,handbook_sections(${HANDBOOK_SECTION_COLUMNS})`)
    .eq("location_id", locationId)
    .eq("status", "published")
    .limit(1)
    .maybeSingle();
  if (byLocation) return byLocation as unknown as Handbook;

  const { data: fallback } = await supabase
    .from("handbooks")
    .select(`id,title,version_label,handbook_sections(${HANDBOOK_SECTION_COLUMNS}),afsc_programs!inner(code)`)
    .is("location_id", null)
    .eq("afsc_programs.code", afscCode)
    .eq("status", "published")
    .limit(1)
    .maybeSingle();
  return fallback as unknown as Handbook | null;
});

export const getFaqs = cache(async (locationId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("faqs")
    .select("id,question,answer,location_id")
    .eq("is_active", true)
    .or(`location_id.eq.${locationId},location_id.is.null`)
    .order("sort_order");
  return data ?? [];
});

export const getEvents = cache(async (locationId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("event_sources")
    .select("id,name,description,source_url,location_id")
    .eq("is_active", true)
    .or(`location_id.eq.${locationId},location_id.is.null`)
    .order("name");
  return data ?? [];
});

export const getContacts = cache(async (locationId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("location_contacts")
    .select("id,display_name,title,email,phone,is_primary")
    .eq("location_id", locationId)
    .eq("is_active", true)
    .order("is_primary", { ascending: false });
  return data ?? [];
});

export const getLocationKudos = cache(async (locationProgramId: string) => {
  const supabase = await createClient();
  const { data: departments } = await supabase
    .from("location_departments")
    .select("id,departments(name,slug)")
    .eq("location_program_id", locationProgramId);
  const departmentIds = (departments ?? []).map((item) => item.id);
  if (!departmentIds.length) return [];

  const { data } = await supabase
    .from("kudos")
    .select("id,message,rating,display_student_name,published_at,location_department_id,preceptor_name,profiles!kudos_student_id_fkey(first_name,last_name)")
    .in("location_department_id", departmentIds)
    .eq("status", "approved")
    .order("published_at", { ascending: false });

  const departmentById = new Map((departments ?? []).map((item) => [item.id, item.departments as unknown as { name: string; slug: string } | null]));
  return (data ?? []).map((item) => ({ ...item, department: departmentById.get(item.location_department_id) ?? null })) as unknown as Array<{
    id: string; message: string; rating: number; display_student_name: boolean; published_at: string; preceptor_name: string;
    profiles: { first_name: string; last_name: string } | null; department: { name: string; slug: string } | null;
  }>;
});
