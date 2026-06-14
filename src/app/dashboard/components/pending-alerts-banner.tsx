import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AlertCircle, FileKey, Inbox, ShieldAlert, ArrowRight } from "lucide-react";

export async function PendingAlertsBanner() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const userId = session.user.id;

  // Executa as queries em paralelo para máxima performance
  const [
    pendingAuditsCount,
    passwordRequiredCount,
    inboxPendingCount,
    importReviewCount
  ] = await Promise.all([
    // 1. Auditorias pendentes (JSON query)
    prisma.transaction.count({
      where: {
        userId,
        metadata: {
          path: ['reviewRequired'],
          equals: true,
        }
      }
    }).catch(() => 0),
    // 2. Documentos aguardando senha
    prisma.financialDocument.count({
      where: {
        userId,
        status: "PASSWORD_REQUIRED"
      }
    }).catch(() => 0),
    // 3. Caixa de Entrada pendente
    prisma.financialInbox.count({
      where: {
        userId,
        status: {
          in: ["PENDING", "PROCESSING", "READY", "NEEDS_CONFIRMATION"]
        }
      }
    }).catch(() => 0),
    // 4. Sugestões de importação pendentes
    prisma.financialDocumentSuggestion.count({
      where: {
        userId,
        status: "PENDING"
      }
    }).catch(() => 0)
  ]);

  const totalAlerts = pendingAuditsCount + passwordRequiredCount + inboxPendingCount + importReviewCount;

  if (totalAlerts === 0) {
    return null;
  }

  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center gap-2 px-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Ações Pendentes ({totalAlerts})
        </h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {pendingAuditsCount > 0 && (
          <div className="group relative flex items-center justify-between rounded-xl border border-amber-200/60 bg-amber-50/40 p-4 transition-all hover:border-amber-300 hover:bg-amber-50/80 dark:border-amber-900/30 dark:bg-amber-950/10">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Auditoria de IA
                </p>
                <p className="text-xs text-slate-500">
                  {pendingAuditsCount} {pendingAuditsCount === 1 ? "lançamento exige" : "lançamentos exigem"} revisão
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/transactions?reviewRequired=true"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 text-slate-700 shadow-sm transition hover:bg-amber-500 hover:text-white dark:bg-slate-900 dark:text-slate-300"
              title="Revisar auditorias"
            >
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        )}

        {passwordRequiredCount > 0 && (
          <div className="group relative flex items-center justify-between rounded-xl border border-red-200/60 bg-red-50/40 p-4 transition-all hover:border-red-300 hover:bg-red-50/80 dark:border-red-900/30 dark:bg-red-950/10">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-500/10 p-2 text-red-600 dark:text-red-400">
                <FileKey className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Senha Necessária
                </p>
                <p className="text-xs text-slate-500">
                  {passwordRequiredCount} {passwordRequiredCount === 1 ? "PDF protegido" : "PDFs protegidos"} pendentes
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/statements?tab=import-review"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 text-slate-700 shadow-sm transition hover:bg-red-500 hover:text-white dark:bg-slate-900 dark:text-slate-300"
              title="Inserir senhas"
            >
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        )}

        {inboxPendingCount > 0 && (
          <div className="group relative flex items-center justify-between rounded-xl border border-blue-200/60 bg-blue-50/40 p-4 transition-all hover:border-blue-300 hover:bg-blue-50/80 dark:border-blue-900/30 dark:bg-blue-950/10">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
                <Inbox className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Caixa de Entrada
                </p>
                <p className="text-xs text-slate-500">
                  {inboxPendingCount} {inboxPendingCount === 1 ? "transação pendente" : "transações pendentes"}
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/inbox"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 text-slate-700 shadow-sm transition hover:bg-blue-500 hover:text-white dark:bg-slate-900 dark:text-slate-300"
              title="Ver Caixa Financeira"
            >
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        )}

        {importReviewCount > 0 && (
          <div className="group relative flex items-center justify-between rounded-xl border border-emerald-200/60 bg-emerald-50/40 p-4 transition-all hover:border-emerald-300 hover:bg-emerald-50/80 dark:border-emerald-900/30 dark:bg-emerald-950/10">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Revisão de Importação
                </p>
                <p className="text-xs text-slate-500">
                  {importReviewCount} {importReviewCount === 1 ? "sugestão aguarda" : "sugestões aguardam"} revisão
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/statements?tab=import-review"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 text-slate-700 shadow-sm transition hover:bg-emerald-500 hover:text-white dark:bg-slate-900 dark:text-slate-300"
              title="Revisar importações"
            >
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
