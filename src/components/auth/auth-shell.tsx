import Link from "next/link";
import { ShieldCheck, Stethoscope } from "lucide-react";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <main className="auth-page">
    <section className="auth-brand-panel">
      <Link href="/" className="brand"><span className="brand-mark"><Stethoscope size={20}/></span><span><strong>PhasePrep</strong><small>Navigator</small></span></Link>
      <div><span className="eyebrow"><ShieldCheck size={14}/> AMSA Phase II</span><h1>Prepare with confidence.<br/><em>Serve with purpose.</em></h1><p>Your role and location are verified before protected clinical training tools become available.</p></div>
      <small>Training support only · Never enter patient-identifying information</small>
    </section>
    <section className="auth-form-panel"><div className="auth-box"><h2>{title}</h2><p className="auth-subtitle">{subtitle}</p>{children}</div></section>
  </main>;
}
