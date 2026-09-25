import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/data/dashboard";
import { DashboardShell } from "../dashboard-shell";
import { ContentEditor, type Field, type Item } from "./content-editor";

const TABS = [
  ["handbook", "Handbook", "handbook"],
  ["faq", "FAQs", "faq"],
  ["departments", "Departments", "departments"],
  ["procedures", "Procedures", "departments"],
  ["contacts", "Contacts", "contact"],
  ["events", "Events", "events"],
  ["site", "Site", ""],
] as const;
type Tab = (typeof TABS)[number][0];

const FORMATTING_HINT = "Leave a blank line between paragraphs. Start a line with \"- \" for a bullet, wrap text in **double asterisks** for bold, and write links as [text](https://…).";

export default async function EditContentPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/pending-approval");
  if (membership.role !== "supervisor" && membership.role !== "platform_admin") redirect("/dashboard");

  const { tab: requestedTab } = await searchParams;
  const isAdmin = membership.role === "platform_admin";
  const visibleTabs = TABS.filter(([key]) => key !== "site" || isAdmin);
  const tab: Tab = visibleTabs.some(([key]) => key === requestedTab) ? (requestedTab as Tab) : "handbook";

  const supabase = await createClient();
  const { data: program } = await supabase.from("location_programs").select("location_id").eq("id", membership.locationProgramId).single();
  const locationId = program?.location_id as string;

  const { data: departmentRows } = await supabase
    .from("location_departments")
    .select("id,display_name,overview,required_hours,welcome_video_url,departments(name)")
    .eq("location_program_id", membership.locationProgramId)
    .eq("is_active", true);
  const departments = (departmentRows ?? []).map((row) => {
    const name = (row.departments as unknown as { name: string } | null)?.name ?? "Department";
    return { ...row, _title: row.display_name || name, name };
  }).sort((a, b) => a._title.localeCompare(b._title));

  let editor: React.ReactNode;
  let intro = "";

  if (tab === "handbook") {
    const { data: own } = await supabase.from("handbooks").select("id,title,location_id").eq("location_id", locationId).eq("status", "published").limit(1).maybeSingle();
    const { data: general } = own ? { data: null } : await supabase.from("handbooks").select("id,title,location_id").is("location_id", null).eq("status", "published").limit(1).maybeSingle();
    const handbook = own ?? general;
    const locked = !own && !isAdmin;
    const { data: sections } = handbook
      ? await supabase.from("handbook_sections").select("id,heading,body,section_group,sort_order").eq("handbook_id", handbook.id).order("sort_order")
      : { data: [] };
    intro = !handbook
      ? "No handbook is set up yet."
      : own
        ? `Editing “${handbook.title}” for ${membership.locationName}.`
        : `${membership.locationName} uses the general handbook shared by every location.${isAdmin ? " Changes here apply to all locations that use it." : " Only a platform admin can edit it."}`;
    const fields: Field[] = [
      { name: "heading", label: "Heading", type: "text", required: true },
      { name: "body", label: "Text", type: "textarea", rows: 12, hint: FORMATTING_HINT },
    ];
    editor = handbook && (
      <ContentEditor table="handbook_sections" itemLabel="Section" titleField="heading" fields={fields}
        items={(sections ?? []).map((section) => ({ ...section, _group: section.section_group ?? undefined, _locked: locked }) as Item)}
        newDefaults={{ handbook_id: handbook.id }} autoSortOrder canAdd={!locked} canDelete={!locked} />
    );
  }

  if (tab === "faq") {
    const { data: faqs } = await supabase.from("faqs").select("id,question,answer,sort_order,is_active,location_id")
      .or(`location_id.eq.${locationId},location_id.is.null`).order("sort_order");
    intro = "Questions shown on this location’s FAQ page. Questions marked “shared” appear at every location.";
    const fields: Field[] = [
      { name: "question", label: "Question", type: "text", required: true },
      { name: "answer", label: "Answer", type: "textarea", required: true, rows: 6, hint: FORMATTING_HINT },
      { name: "sort_order", label: "Order (lower numbers show first)", type: "number" },
      { name: "is_active", label: "Show on the site", type: "checkbox" },
    ];
    editor = (
      <ContentEditor table="faqs" itemLabel="Question" titleField="question" fields={fields}
        items={(faqs ?? []).map((faq) => ({ ...faq, _group: faq.location_id ? membership.locationName : "Shared by all locations", _locked: !faq.location_id && !isAdmin }) as Item)}
        newDefaults={{ location_id: locationId, is_active: true }} />
    );
  }

  if (tab === "departments") {
    intro = "The overview and details shown on each department page.";
    const fields: Field[] = [
      { name: "display_name", label: "Display name", type: "text", hint: "Leave blank to use the standard department name." },
      { name: "overview", label: "Overview", type: "textarea", rows: 8, hint: FORMATTING_HINT },
      { name: "required_hours", label: "Required hours", type: "number" },
      { name: "welcome_video_url", label: "Welcome video link", type: "url" },
    ];
    editor = (
      <ContentEditor table="location_departments" itemLabel="Department" titleField="_title" fields={fields}
        items={departments as unknown as Item[]} canAdd={false} canDelete={false} />
    );
  }

  if (tab === "procedures") {
    const departmentName = new Map(departments.map((department) => [department.id, department._title]));
    const { data: procedures } = departments.length
      ? await supabase.from("department_procedures")
          .select("id,location_department_id,name,what_it_is,why_it_is_used,how_it_works,student_learning_objectives,equipment,external_resource_url,video_url,status,sort_order")
          .in("location_department_id", departments.map((department) => department.id)).order("sort_order")
      : { data: [] };
    intro = "Procedures listed on each department page. Set a procedure to “Hidden” to take it off the site without deleting it.";
    const fields: Field[] = [
      { name: "location_department_id", label: "Department", type: "select", required: true, newOnly: true, options: departments.map((department) => ({ value: department.id, label: department._title })) },
      { name: "name", label: "Procedure name", type: "text", required: true },
      { name: "what_it_is", label: "What it is", type: "textarea", rows: 3 },
      { name: "why_it_is_used", label: "Why it’s used", type: "textarea", rows: 3 },
      { name: "how_it_works", label: "How it works", type: "textarea", rows: 4 },
      { name: "student_learning_objectives", label: "Student learning objectives", type: "textarea", rows: 3 },
      { name: "equipment", label: "Equipment", type: "textarea", rows: 3 },
      { name: "external_resource_url", label: "Learn-more link", type: "url" },
      { name: "video_url", label: "Demonstration video link", type: "url" },
      { name: "status", label: "Visibility", type: "select", required: true, options: [{ value: "published", label: "Visible on the site" }, { value: "draft", label: "Hidden (draft)" }] },
    ];
    editor = (
      <ContentEditor table="department_procedures" itemLabel="Procedure" titleField="name" fields={fields}
        items={(procedures ?? []).map((procedure) => ({ ...procedure, _group: departmentName.get(procedure.location_department_id) }) as Item)
          .sort((a, b) => String(a._group).localeCompare(String(b._group)))}
        autoSortOrder slugFrom="name" newDefaults={{ status: "published" }} />
    );
  }

  if (tab === "contacts") {
    const { data: contacts } = await supabase.from("location_contacts").select("id,display_name,title,email,phone,is_primary,is_active")
      .eq("location_id", locationId).order("is_primary", { ascending: false });
    intro = "People listed on this location’s Contact page.";
    const fields: Field[] = [
      { name: "display_name", label: "Name", type: "text", required: true },
      { name: "title", label: "Title / role", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "is_primary", label: "Primary contact (shown first)", type: "checkbox" },
      { name: "is_active", label: "Show on the site", type: "checkbox" },
    ];
    editor = (
      <ContentEditor table="location_contacts" itemLabel="Contact" titleField="display_name" fields={fields}
        items={(contacts ?? []) as Item[]} newDefaults={{ location_id: locationId, is_active: true }} />
    );
  }

  if (tab === "events") {
    const { data: events } = await supabase.from("event_sources").select("id,name,description,source_url,is_active,location_id")
      .or(`location_id.eq.${locationId},location_id.is.null`).order("name");
    intro = "Event calendars and links shown on this location’s Events page.";
    const fields: Field[] = [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea", rows: 3 },
      { name: "source_url", label: "Link", type: "url", required: true },
      { name: "is_active", label: "Show on the site", type: "checkbox" },
    ];
    editor = (
      <ContentEditor table="event_sources" itemLabel="Event link" titleField="name" fields={fields}
        items={(events ?? []).map((event) => ({ ...event, _group: event.location_id ? membership.locationName : "Shared by all locations", _locked: !event.location_id && !isAdmin }) as Item)}
        newDefaults={{ location_id: locationId, source_type: "external_link", is_active: true }} />
    );
  }

  if (tab === "site") {
    const { data: settings } = await supabase.from("site_settings").select("id,key,label,value").order("label");
    intro = "Site-wide settings. For the “See how it works” video, paste a YouTube or Loom link, or a direct link to a video file. Leave it blank to use the built-in walkthrough.";
    const fields: Field[] = [{ name: "value", label: "Value", type: "text", hint: "e.g. https://youtu.be/… or https://www.loom.com/share/…" }];
    editor = (
      <ContentEditor table="site_settings" itemLabel="Setting" titleField="label" fields={fields}
        items={(settings ?? []) as Item[]} canAdd={false} canDelete={false} />
    );
  }

  const sitePath = TABS.find(([key]) => key === tab)?.[2];
  const viewHref = tab === "site" ? "/" : `/locations/${membership.locationSlug}/${sitePath}`;

  return (
    <DashboardShell membership={membership} activeHref="/dashboard/content">
      <div className="approval-page-head">
        <span className="eyebrow">Supervisor tools</span>
        <h1>Edit content</h1>
        <p>Change what students see on the {membership.locationName} pages. Saved changes go live right away.</p>
      </div>
      <nav className="content-tabs">
        {visibleTabs.map(([key, label]) => <Link key={key} href={`/dashboard/content?tab=${key}`} className={key === tab ? "active" : ""}>{label}</Link>)}
      </nav>
      <section className="queue-card content-card">
        <div className="content-intro">
          <p>{intro}</p>
          {membership.locationSlug && <Link className="text-link" href={viewHref} target="_blank">View on site <ExternalLink size={13} /></Link>}
        </div>
        {editor}
      </section>
    </DashboardShell>
  );
}
