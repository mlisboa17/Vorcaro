import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { VorcaroActionsDashboard } from "@/components/vorcaro/vorcaro-actions-dashboard";

export default async function VorcaroActionsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/api/auth/signin?callbackUrl=/dashboard/vorcaro/actions");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ações Vorcaro</h1>
        <p className="mt-1 text-sm text-slate-500">
          Propostas assistidas — confirme no chat ou gerencie aqui (navegação apenas).
        </p>
      </header>
      <VorcaroActionsDashboard />
    </div>
  );
}
