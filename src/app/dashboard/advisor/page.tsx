import { redirect } from "next/navigation";

// Advisor foi consolidado em Vorcaro Hub. Redirecionando para novo local.
export default function AdvisorPage() {
  redirect("/dashboard/vorcaro");
}
