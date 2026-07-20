"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inviteUser } from "@/app/actions/settings";
import type { Enums } from "@/lib/supabase/types";
import type { LocationSummary } from "@/lib/data/workspace";

const ROLES: Enums<"membership_role">[] = [
  "org_admin",
  "owner",
  "general_manager",
  "assistant_manager",
  "kitchen_manager",
  "foh_manager",
  "read_only",
];

export function InviteUserForm({
  organizationId,
  locations,
}: {
  organizationId: string;
  locations: LocationSummary[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Enums<"membership_role">>("general_manager");
  const [locationId, setLocationId] = useState<string>("org-wide");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleInvite() {
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);
    const result = await inviteUser({
      organizationId,
      locationId: locationId === "org-wide" ? null : locationId,
      email,
      role,
    });
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    setEmail("");
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <h3 className="mb-3 text-sm font-semibold">Invite a teammate</h3>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="invite-email" className="text-sm">
            Email
          </label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-11 rounded-lg border border-border bg-transparent px-3 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="invite-role" className="text-sm">
            Role
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as Enums<"membership_role">)}
            className="min-h-11 rounded-lg border border-border bg-transparent px-3 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="invite-location" className="text-sm">
            Location
          </label>
          <select
            id="invite-location"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="min-h-11 rounded-lg border border-border bg-transparent px-3 text-sm"
          >
            <option value="org-wide">All locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleInvite}
          disabled={isSubmitting || !email}
          className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-background disabled:opacity-60"
        >
          Send invite
        </button>
      </div>
      {success && <p className="mt-2 text-sm text-success">Invite sent.</p>}
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
