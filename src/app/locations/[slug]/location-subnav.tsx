"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  ["", "Overview"],
  ["/departments", "Departments"],
  ["/checklist", "Checklist"],
  ["/handbook", "Handbook"],
  ["/faq", "FAQ"],
  ["/events", "Events"],
  ["/kudos", "Kudos"],
  ["/contact", "Contact"],
] as const;

export function LocationSubnav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/locations/${slug}`;

  return (
    <nav className="location-subnav" aria-label="Location sections">
      {tabs.map(([path, label]) => {
        const href = `${base}${path}`;
        const active = pathname === href;
        return <Link key={label} href={href} className={active ? "active" : ""}>{label}</Link>;
      })}
    </nav>
  );
}
