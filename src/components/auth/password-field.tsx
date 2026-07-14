"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function PasswordField({ name="password", label="Password", autoComplete="current-password" }: { name?: string; label?: string; autoComplete?: string }) {
  const [visible,setVisible]=useState(false);
  return <label className="field"><span>{label}</span><div className="password-wrap"><input name={name} type={visible?"text":"password"} autoComplete={autoComplete} required minLength={8}/><button type="button" onClick={()=>setVisible(!visible)} aria-label={visible?"Hide password":"Show password"}>{visible?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>;
}
