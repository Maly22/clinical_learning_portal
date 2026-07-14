import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "./sign-up-form";

export default function SignUpPage(){return <AuthShell title="Create your account" subtitle="Choose your Phase II location and requested role. A supervisor will review your access."><SignUpForm/></AuthShell>}
