"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveLaborRole, setLaborRoleActive } from "@/app/actions/settings";
import type { Enums } from "@/lib/supabase/types";

interface RoleRow {
  id: string;
  name: string;
  category: Enums<"labor_role_category">;
  default_hourly_wage: number | null;
  is_active: boolean;
}

const CATEGORIES: Enums<"labor_role_category">[] = ["foh", "boh", "management"];

export function RoleForm({ organizationId, roles }: { organizationId: string; roles: RoleRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Enums<"labor_role_category">>("foh");
  const [wage, setWage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAdd() {
    setError(null);
    setIsSubmitting(true);
    const result = await saveLaborRole({
      organizationId,
      name,
      category,
      defaultHourlyWage: wage.trim() === "" ? null : Number(wage),
    });
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setName("");
    setWage("");
    router.refresh();
  }

  async function handleToggle(roleId: string, isActive: boolean) {
    await setLaborRoleActive(organizationId, roleId, !isActive);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Default wage</th>
              <th className="px-3 py-2 font-medium">Active</th>
              <th className="px-3 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {roles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-muted">
                  No roles configured yet.
                </td>
              </tr>
            ) : (
              roles.map((role) => (
                <tr key={role.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">{role.name}</td>
                  <td className="px-3 py-2 text-muted">{role.category}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {role.default_hourly_wage === null ? "—" : `$${role.default_hourly_wage}/hr`}
                  </td>
                  <td className="px-3 py-2">{role.is_active ? "Yes" : "No"}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => handleToggle(role.id, role.is_active)}
                      className="text-sm text-accent-strong underline"
                    >
                      {role.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-border p-4">
        <h3 className="mb-3 text-sm font-semibold">Add a role</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="role-name" className="text-sm">
              Name
            </label>
            <input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Server"
              className="min-h-11 rounded-lg border border-border bg-transparent px-3 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="role-category" className="text-sm">
              Category
            </label>
            <select
              id="role-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Enums<"labor_role_category">)}
              className="min-h-11 rounded-lg border border-border bg-transparent px-3 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="role-wage" className="text-sm">
              Default wage ($/hr)
            </label>
            <input
              id="role-wage"
              type="number"
              min="0"
              step="0.01"
              value={wage}
              onChange={(e) => setWage(e.target.value)}
              className="min-h-11 w-32 rounded-lg border border-border bg-transparent px-3 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={isSubmitting || !name}
            className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-background disabled:opacity-60"
          >
            Add
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
