import { redirect } from "next/navigation";

export default async function SettingsIntegrationsPage() {
  redirect("/dashboard/settings?tab=integracoes");
}
