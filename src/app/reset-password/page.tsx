import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "./reset-password-form";
export default function ResetPasswordPage(){return <AuthShell title="Choose a new password" subtitle="Use at least eight characters and avoid reusing a password from another account."><ResetPasswordForm/></AuthShell>}
