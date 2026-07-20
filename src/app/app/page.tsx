import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserContext } from "@/lib/auth/session";
import { getUserLocations } from "@/lib/data/workspace";

export default async function AppHomePage() {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");

  const locations = await getUserLocations(context);

  if (locations.length === 0) {
    return (
      <div className="rounded-xl border border-border p-6">
        <h1 className="mb-2 text-lg font-semibold">No organization yet</h1>
        <p className="text-sm text-muted">
          Your account isn&apos;t linked to any organization or location yet. If you signed up
          expecting an organization to be created automatically, try signing out and back in — if
          this persists, ask your Org Admin to add you from Settings &gt; Users, or{" "}
          <Link href="/signup" className="text-accent-strong underline">
            create a new organization
          </Link>
          .
        </p>
      </div>
    );
  }

  redirect(`/app/entry?location=${locations[0].id}`);
}
