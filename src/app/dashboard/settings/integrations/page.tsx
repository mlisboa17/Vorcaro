import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TelegramIntegrationsPanel } from "@/components/settings/telegram-integrations-panel";
import { IntegrationManagerCard } from "@/modules/integrations/components/integration-manager-card";
import { ArrowLeft } from "lucide-react";

export default async function SettingsIntegrationsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/api/auth/signin?callbackUrl=/dashboard/settings/integrations");
  }

  const accounts = await prisma.financialAccount.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, webhookToken: true },
    orderBy: { createdAt: "asc" },
  });

  const accountViewData = accounts.map((acc) => ({
    id: acc.id,
    name: acc.name,
    hasToken: !!acc.webhookToken,
  }));

  // URL Base para o componente de cliente montar a string completa
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://api.logos.finance";

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar aos cadastros
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">Integrações</h1>
        <p className="mt-1 text-sm text-slate-500">
          Conecte canais externos ao Vorcaro Finance Control.
        </p>
      </header>

      <IntegrationManagerCard accounts={accountViewData} baseUrl={baseUrl} />
      
      <div className="mt-8 border-t border-slate-200 pt-8">
        <TelegramIntegrationsPanel />
      </div>
    </div>
  );
}
