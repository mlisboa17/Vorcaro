import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { VorcaroHubDashboard } from "@/components/vorcaro/vorcaro-hub-dashboard";

export default async function VorcaroHubPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/api/auth/signin?callbackUrl=/dashboard/vorcaro");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Vorcaro</h1>
        <p className="mt-1 text-sm text-slate-500">
          Hub do assistente financeiro — acesse chat, ações, pendências e memória em um só lugar.
        </p>
      </header>
      <VorcaroHubDashboard />
    </div>
  );
}
