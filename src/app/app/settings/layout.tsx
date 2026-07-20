import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserContext, hasAnyRole } from "@/lib/auth/session";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");

  const isOrgAdmin = hasAnyRole(context.memberships, ["org_admin"]);
  const isOrgAdminOrOwner = hasAnyRole(context.memberships, ["org_admin", "owner"]);

  if (context.memberships.length === 0) {
    return (
      <div className="rounded-xl border border-border p-6 text-sm text-muted">
        You don&apos;t have any organization memberships yet.
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Settings</h1>
      <div className="flex flex-col gap-6 sm:flex-row">
        <nav className="flex shrink-0 flex-row gap-2 overflow-x-auto sm:w-44 sm:flex-col">
          <Link href="/app/settings/dayparts" className="min-h-11 flex items-center px-2 text-sm">
            Dayparts
          </Link>
          {isOrgAdmin && (
            <Link href="/app/settings/roles" className="min-h-11 flex items-center px-2 text-sm">
              Roles
            </Link>
          )}
          {isOrgAdminOrOwner && (
            <Link href="/app/settings/targets" className="min-h-11 flex items-center px-2 text-sm">
              Targets
            </Link>
          )}
          <Link href="/app/settings/import" className="min-h-11 flex items-center px-2 text-sm">
            Import CSV
          </Link>
          {isOrgAdmin && (
            <>
              <Link href="/app/settings/users" className="min-h-11 flex items-center px-2 text-sm">
                Users
              </Link>
              <Link href="/app/settings/org" className="min-h-11 flex items-center px-2 text-sm">
                Org settings
              </Link>
            </>
          )}
        </nav>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
