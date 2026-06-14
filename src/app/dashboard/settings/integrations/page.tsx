import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TelegramIntegrationsPanel } from "@/components/settings/telegram-integrations-panel";
import { IntegrationManagerCard } from "@/modules/integrations/components/integration-manager-card";
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { getWebhookLogs } from "@/modules/integrations/actions/get-webhook-logs";

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

  // Busca os logs restritos ao tenant e limitados em 10 pelo backend
  const logs = await getWebhookLogs();

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
      
      {/* Seção de Histórico de Conexões Recentes */}
      <div className="mt-8 border-t border-slate-200 pt-8">
        <h2 className="text-lg font-medium text-slate-900 mb-4">Histórico de Conexões Recentes</h2>
        
        {logs.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            Nenhuma atividade de webhook registrada recentemente.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Provedor</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID do Evento</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.status === "SUCCESS" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Sucesso
                        </span>
                      )}
                      {log.status === "IGNORED" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Ignorado
                        </span>
                      )}
                      {log.status === "ERROR" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 border border-red-200">
                          <XCircle className="h-3.5 w-3.5" />
                          Erro
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 capitalize">
                      {log.provider}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                      {log.eventId || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">
                      {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(log.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 border-t border-slate-200 pt-8">
        <TelegramIntegrationsPanel />
      </div>
    </div>
  );
}
