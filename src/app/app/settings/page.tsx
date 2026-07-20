import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth/session";

export default async function SettingsIndexPage() {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");
  redirect("/app/settings/dayparts");
}
