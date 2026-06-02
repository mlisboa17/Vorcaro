"use client";

import { Loader2, MessageCircle, Unlink } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

interface IntegrationStatus {
  botConfigured: boolean;
  webhookUrl: string;
  webhookSecretConfigured: boolean;
  connection: {
    id: string;
    username: string | null;
    firstName: string | null;
    telegramChatId: string;
    connectedAt: string;
  } | null;
}

interface PendingCode {
  code: string;
  expiresAt: string;
  command: string;
  ttlMinutes: number;
}

export function TelegramIntegrationsPanel() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [pendingCode, setPendingCode] = useState<PendingCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/telegram/integration");
      if (res.status === 401) {
        setError("Faça login para gerenciar integrações.");
        return;
      }
      if (!res.ok) {
        throw new Error("Falha ao carregar integração Telegram");
      }
      setStatus(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleGenerateCode() {
    setActing(true);
    setError(null);
    try {
      const res = await fetch("/api/telegram/integration", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Não foi possível gerar o código");
      }
      setPendingCode(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar código");
    } finally {
      setActing(false);
    }
  }

  async function handleDisconnect() {
    setActing(true);
    setError(null);
    try {
      const res = await fetch("/api/telegram/integration", { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao desvincular");
      setPendingCode(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao desvincular");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-sky-100 p-3 text-sky-700">
            <MessageCircle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900">Telegram</h2>
            <p className="mt-1 text-sm text-slate-600">
              Vincule seu bot para enviar lançamentos por texto, áudio ou foto direto para a Caixa
              Financeira.
            </p>
          </div>
        </div>

        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Bot configurado</dt>
            <dd className={cn("font-medium", status?.botConfigured ? "text-emerald-700" : "text-amber-700")}>
              {status?.botConfigured ? "Sim" : "Não (TELEGRAM_BOT_TOKEN)"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Webhook secret</dt>
            <dd className={cn("font-medium", status?.webhookSecretConfigured ? "text-emerald-700" : "text-amber-700")}>
              {status?.webhookSecretConfigured ? "Configurado" : "Opcional em dev"}
            </dd>
          </div>
        </dl>

        {status?.connection ? (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-medium">Conta vinculada</p>
            <p className="mt-1">
              {status.connection.firstName ?? status.connection.username ?? "Chat"}{" "}
              <span className="text-emerald-700">· chat {status.connection.telegramChatId}</span>
            </p>
            <p className="mt-1 text-xs text-emerald-800">
              Desde {new Date(status.connection.connectedAt).toLocaleString("pt-BR")}
            </p>
            <button
              type="button"
              onClick={() => void handleDisconnect()}
              disabled={acting}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
            >
              <Unlink className="h-4 w-4" />
              Desvincular
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <button
              type="button"
              onClick={() => void handleGenerateCode()}
              disabled={acting || !status?.botConfigured}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Gerar código de vínculo
            </button>

            {pendingCode ? (
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
                <p className="text-sm font-medium text-sky-900">Envie no Telegram:</p>
                <p className="mt-2 font-mono text-lg tracking-widest text-sky-950">{pendingCode.command}</p>
                <p className="mt-2 text-xs text-sky-800">
                  Expira em {pendingCode.ttlMinutes} min ({new Date(pendingCode.expiresAt).toLocaleTimeString("pt-BR")})
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold">Desenvolvimento local (ngrok / cloudflared)</p>
        <p className="mt-2">
          O Telegram não chama <code className="rounded bg-amber-100 px-1">localhost</code>. Exponha a API com
          túnel HTTPS e registre o webhook:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-amber-100/80 p-3 text-xs">
          {`ngrok http 3000\n# Webhook URL:\n${status?.webhookUrl ?? "https://<tunnel>/api/telegram/webhook"}`}
        </pre>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}
    </div>
  );
}
