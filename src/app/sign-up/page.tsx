import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "./sign-up-form";

type Search = { email?: string; program?: string; role?: string; first_name?: string };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<Search> }) {
  const invite = await searchParams;
  return <AuthShell title="Create your account" subtitle="Choose your Phase II location and requested role. A supervisor will review your access."><SignUpForm invite={invite}/></AuthShell>;
}
