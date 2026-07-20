import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserContext } from "@/lib/auth/session";
import { signOut } from "@/app/actions/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const context = await getCurrentUserContext();
  if (!context) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/app" className="text-sm font-semibold">
            unKAGEd Labor
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/app/entry" className="min-h-11 flex items-center px-1">
              Daily Entry
            </Link>
            <Link href="/app/dashboard" className="min-h-11 flex items-center px-1">
              Dashboard
            </Link>
            <Link href="/app/trend" className="min-h-11 flex items-center px-1">
              Weekly Trend
            </Link>
            <Link href="/app/settings" className="min-h-11 flex items-center px-1">
              Settings
            </Link>
            <span className="hidden text-muted sm:inline">{context.displayName}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="min-h-11 rounded-lg border border-border px-3 text-sm"
              >
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
