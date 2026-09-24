import { Stethoscope } from "lucide-react";
import { FeedbackButton } from "@/components/feedback/feedback-button";

export function SiteFooter() {
  return (
    <footer>
      <div className="brand inverse"><span className="brand-mark"><Stethoscope size={20} /></span><span><strong>PhasePrep</strong><small>Navigator</small></span></div>
      <p>Foundational clinical preparation for AMSA Phase II training.</p>
      <FeedbackButton />
      <span>Training support only · No PHI</span>
    </footer>
  );
}
