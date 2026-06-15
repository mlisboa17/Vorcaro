import { redirect } from "next/navigation";

export default async function AccountsRedirectPage() {
  redirect("/dashboard/settings?tab=contas");
}
