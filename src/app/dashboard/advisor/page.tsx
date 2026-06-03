import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdvisorDashboard } from "@/components/advisor/advisor-dashboard";

export default async function AdvisorPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/api/auth/signin?callbackUrl=/dashboard/advisor");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">IA Financeira</h1>
        <p className="mt-1 text-sm text-slate-500">
          Consultor com dados reais do Vorcaro — Groq, Gemini e OpenRouter com fallback automático.
        </p>
      </header>
      <AdvisorDashboard />
    </div>
  );
}
