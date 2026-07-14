"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PasswordField } from "@/components/auth/password-field";
import { createClient } from "@/lib/supabase/client";

export function SignInForm(){
 const router=useRouter();const params=useSearchParams();const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError("");const form=new FormData(event.currentTarget);try{const supabase=createClient();const {data,error}=await supabase.auth.signInWithPassword({email:String(form.get("email")).trim().toLowerCase(),password:String(form.get("password"))});if(error)throw error;const {data:memberships}=await supabase.from("memberships").select("id").eq("user_id",data.user.id).eq("is_active",true).limit(1);const next=params.get("next");router.replace(memberships?.length?(next&&next.startsWith("/")?next:"/dashboard"):"/pending-approval");router.refresh()}catch(err){const message=err instanceof Error?err.message:"Sign in failed";setError(message.toLowerCase().includes("invalid login")?"The email or password is incorrect. Check both fields and try again.":message.toLowerCase().includes("email not confirmed")?"Please confirm your email before signing in.":message)}finally{setBusy(false)}}
 const notice=params.get("registered")?"Account created. Check your email to confirm it, then sign in.":params.get("reset")?"Password updated. You can now sign in.":params.get("error")?"The confirmation link is invalid or expired.":"";
 return <form className="auth-form" onSubmit={submit}><label className="field"><span>Email</span><input name="email" type="email" autoComplete="email" inputMode="email" required/></label><PasswordField/><div className="form-options"><label><input type="checkbox" defaultChecked/> Keep me signed in</label><Link href="/forgot-password">Forgot password?</Link></div>{notice&&<div className="form-success" role="status">{notice}</div>}{error&&<div className="form-error" role="alert">{error}</div>}<button className="button auth-submit" disabled={busy}>{busy?"Signing in…":"Sign in"}</button><p className="auth-foot">New to PhasePrep? <Link href="/sign-up">Create an account</Link></p></form>
}
