import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "./sign-in-form";

export default function SignInPage(){return <AuthShell title="Welcome back" subtitle="Sign in with the email and password you used when creating your account."><Suspense><SignInForm/></Suspense></AuthShell>}
