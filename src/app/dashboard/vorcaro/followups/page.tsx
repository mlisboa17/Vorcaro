import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { VorcaroFollowupsDashboard } from "@/components/vorcaro/vorcaro-followups-dashboard";

export default async function VorcaroFollowupsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/api/auth/signin?callbackUrl=/dashboard/vorcaro/followups");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pendências Vorcaro</h1>
        <p className="mt-1 text-sm text-slate-500">
          Follow-ups inteligentes — lembretes e acompanhamentos sem mutação de dados financeiros.
        </p>
      </header>
      <VorcaroFollowupsDashboard />
    </div>
  );
}
