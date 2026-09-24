"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ROLES = [
  ["student", "Student"],
  ["preceptor", "Preceptor"],
  ["supervisor", "Supervisor"],
  ["platform_admin", "Platform admin"],
] as const;

export function RoleSelect({ userId, programId, role, isSelf }: { userId: string; programId: string; role: string; isSelf: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function change(event: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = event.target.value;
    const label = ROLES.find(([value]) => value === newRole)?.[1] ?? newRole;
    const warning = isSelf && role === "platform_admin"
      ? `Step down to ${label}? You will lose admin access.`
      : `Change this user's role to ${label}?`;
    if (!window.confirm(warning)) {
      event.target.value = role;
      return;
    }

    setBusy(true);
    setError("");
    const { error: rpcError } = await createClient().rpc("set_member_role", { target_user: userId, program_id: programId, new_role: newRole });
    setBusy(false);
    if (rpcError) {
      event.target.value = role;
      setError(rpcError.message);
      return;
    }
    router.refresh();
  }

  return (
    <span className="role-select">
      <select defaultValue={role} onChange={change} disabled={busy} aria-label="Role">
        {ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      {error && <small className="form-error">{error}</small>}
    </span>
  );
}
