import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PhasePrep Navigator | AMSA Phase II",
  description: "Clinical preparation, schedules, feedback, and preceptor recognition for AMSA Phase II training.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
