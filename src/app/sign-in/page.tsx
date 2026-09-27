import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "./sign-in-form";
import { PhoneHandoff } from "@/components/phone-handoff";

export default function SignInPage(){return <AuthShell title="Welcome back" subtitle="Sign in with the email and password you used when creating your account."><Suspense><SignInForm/></Suspense><PhoneHandoff hint="Scan to sign in on your phone instead." /></AuthShell>}
