import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { VorcaroTimelineDashboard } from "@/components/vorcaro/vorcaro-timeline-dashboard";

export default async function VorcaroTimelinePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/api/auth/signin?callbackUrl=/dashboard/vorcaro/timeline");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Memória Financeira</h1>
        <p className="mt-1 text-sm text-slate-500">
          Trajetória, tendências e conquistas — Vorcaro com visão longitudinal.
        </p>
      </header>
      <VorcaroTimelineDashboard />
    </div>
  );
}
