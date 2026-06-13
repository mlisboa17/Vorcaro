"use client";

import { useState, useTransition } from "react";
import { generateWebhookToken, revokeWebhookToken } from "../actions/webhook-tokens";
import { Copy, Trash2, Webhook, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface AccountWithWebhook {
  id: string;
  name: string;
  hasToken: boolean;
}

interface IntegrationManagerCardProps {
  accounts: AccountWithWebhook[];
  baseUrl: string;
}

export function IntegrationManagerCard({ accounts, baseUrl }: IntegrationManagerCardProps) {
  const [isPending, startTransition] = useTransition();
  const [newTokens, setNewTokens] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = (accountId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await generateWebhookToken(accountId);
      if (result.success && result.token) {
        setNewTokens((prev) => ({ ...prev, [accountId]: result.token! }));
      } else {
        setError(result.message);
      }
    });
  };

  const handleRevoke = (accountId: string) => {
    if (!confirm("Tem certeza que deseja revogar o acesso deste webhook? Ele deixará de receber transações imediatamente.")) {
      return;
    }
    setError(null);
    setNewTokens((prev) => {
      const copy = { ...prev };
      delete copy[accountId];
      return copy;
    });

    startTransition(async () => {
      const result = await revokeWebhookToken(accountId);
      if (!result.success) {
        setError(result.message);
      }
    });
  };

  const handleCopy = async (accountId: string, token: string) => {
    const url = `${baseUrl}/api/webhooks/bank-integration?token=${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(accountId);
    setTimeout(() => setCopied(null), 2000);
  };

  if (accounts.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">
          Você não possui contas financeiras cadastradas. Cadastre uma conta para configurar webhooks.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <Webhook className="h-5 w-5 text-indigo-500" />
        <h2 className="text-lg font-semibold text-slate-800">APIs Bancárias e Gateways</h2>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="space-y-4">
        {accounts.map((acc) => {
          const newlyGeneratedToken = newTokens[acc.id];
          const isActive = acc.hasToken || !!newlyGeneratedToken;

          return (
            <div key={acc.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-medium text-slate-800">{acc.name}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                        Webhook Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                        Inativo
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isActive && (
                    <button
                      onClick={() => handleGenerate(acc.id)}
                      disabled={isPending}
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ativar Webhook"}
                    </button>
                  )}

                  {isActive && (
                    <button
                      onClick={() => handleRevoke(acc.id)}
                      disabled={isPending}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Revogar
                    </button>
                  )}
                </div>
              </div>

              {isActive && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  {newlyGeneratedToken ? (
                    <div className="space-y-2">
                      <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                        <strong>Aviso:</strong> Copie esta URL agora. O token completo não será exibido novamente após a página ser recarregada.
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="block flex-1 rounded bg-slate-800 p-2 text-xs text-emerald-400 break-all overflow-hidden text-ellipsis whitespace-nowrap">
                          {baseUrl}/api/webhooks/bank-integration?token={newlyGeneratedToken}
                        </code>
                        <button
                          onClick={() => handleCopy(acc.id, newlyGeneratedToken)}
                          className="inline-flex shrink-0 items-center gap-2 rounded bg-slate-200 p-2 text-slate-700 hover:bg-slate-300 transition"
                          title="Copiar URL Completa"
                        >
                          {copied === acc.id ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">URL do Endpoint de Integração:</p>
                      <code className="block w-full rounded bg-slate-100 p-2 text-xs text-slate-500 text-center">
                        {baseUrl}/api/webhooks/bank-integration?token=••••••••••••••••••••••••••••••••
                      </code>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
