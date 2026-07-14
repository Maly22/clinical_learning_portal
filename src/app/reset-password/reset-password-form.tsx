"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordField } from "@/components/auth/password-field";
import { createClient } from "@/lib/supabase/client";
export function ResetPasswordForm(){const router=useRouter();const [error,setError]=useState("");const [busy,setBusy]=useState(false);async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError("");const form=new FormData(event.currentTarget);const password=String(form.get("password"));const confirm=String(form.get("confirm"));if(password!==confirm){setError("The passwords do not match.");setBusy(false);return}const supabase=createClient();const {error}=await supabase.auth.updateUser({password});if(error){setError(error.message);setBusy(false);return}router.replace("/sign-in?reset=1")}return <form className="auth-form" onSubmit={submit}><PasswordField autoComplete="new-password"/><PasswordField name="confirm" label="Confirm password" autoComplete="new-password"/>{error&&<div className="form-error">{error}</div>}<button className="button auth-submit" disabled={busy}>{busy?"Updating…":"Update password"}</button></form>}
