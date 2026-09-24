import Link from "next/link";
import { ArrowRight, LogOut, Stethoscope } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

// Piloting without public sign-up for now. Flip back to true to restore the header links.
const SHOW_AUTH_LINKS = false;

export async function SiteHeader() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="PhasePrep Navigator home">
        <span className="brand-mark"><Stethoscope size={20} /></span>
        <span><strong>PhasePrep</strong><small>Navigator</small></span>
      </Link>
      <nav aria-label="Primary navigation">
        <Link href="/#program">Program</Link>
        <Link href="/about">About</Link>
        <Link href="/locations">Locations</Link>
        <Link href="/#resources">Resources</Link>
      </nav>
      <div className="header-actions">
        {user ? (
          <>
            <form action="/auth/sign-out" method="post"><button type="submit" className="text-link header-signout"><LogOut size={13} /> Sign out</button></form>
            <Link className="button small" href="/dashboard">Dashboard <ArrowRight size={15} /></Link>
          </>
        ) : SHOW_AUTH_LINKS ? (
          <>
            <Link className="text-link" href="/sign-in">Sign in</Link>
            <Link className="button small" href="/sign-up">Create account <ArrowRight size={15} /></Link>
          </>
        ) : null}
      </div>
    </header>
  );
}
