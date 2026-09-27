"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Smartphone } from "lucide-react";

/**
 * Government networks open this site in read-only mode, so typing (sign-in, forms) is
 * blocked there. This QR code opens the current page on the user's phone instead.
 * Hidden on phone-sized screens, where it isn't needed.
 */
export function PhoneHandoff({ hint = "Scan to open this page on your phone.", compact = false }: { hint?: string; compact?: boolean }) {
  const [svg, setSvg] = useState("");

  useEffect(() => {
    QRCode.toString(window.location.href, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0a3161", light: "#ffffff" } })
      .then(setSvg)
      .catch(() => setSvg(""));
  }, []);

  if (!svg) return null;
  return (
    <aside className={`phone-handoff${compact ? " compact" : ""}`}>
      {/* SVG markup generated locally by the qrcode library from the page URL. */}
      <div className="phone-handoff-code" dangerouslySetInnerHTML={{ __html: svg }} />
      <div>
        <strong><Smartphone size={14} /> Using a government computer?</strong>
        <p>Typing may be blocked on government networks. {hint}</p>
      </div>
    </aside>
  );
}
