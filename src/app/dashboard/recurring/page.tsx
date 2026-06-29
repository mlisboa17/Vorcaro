import { redirect } from "next/navigation";

export default async function RecurringPage() {
  redirect("/dashboard/settings?tab=recorrentes");
}
