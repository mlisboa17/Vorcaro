"use client";

import { useState, useTransition } from "react";
import { approveStatementLine } from "../actions/approve-statement-line";
import { rejectStatementLine } from "../actions/reject-statement-line";
import { ArrowUpRight, ArrowDownLeft, Check, X, Loader2, AlertCircle, Link2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface StagingLine {
  id: string;
  description: string;
  amount: number;
  date: Date;
  cnpjCpf: string | null;
  suggestedName: string | null;
  originId: string | null;
  destinationId: string | null;
  score: number;
  status: string;
  reconciliationMatchId: string | null;
}

interface ImportReviewListProps {
  initialLines: StagingLine[];
}

export function ImportReviewList({ initialLines }: ImportReviewListProps) {
  const [lines, setLines] = useState<StagingLine[]>(initialLines);
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleApprove = (id: string) => {
    setBusyId(id);
    setErrorMsg(null);
    startTransition(async () => {
      const result = await approveStatementLine(id);
      if (result.success) {
        setLines((prev) => prev.filter((line) => line.id !== id));
      } else {
        setErrorMsg(result.error ?? "Erro ao aprovar lançamento.");
      }
      setBusyId(null);
    });
  };

  const handleReject = (id: string) => {
    setBusyId(id);
    setErrorMsg(null);
    startTransition(async () => {
      const result = await rejectStatementLine(id);
      if (result.success) {
        setLines((prev) => prev.filter((line) => line.id !== id));
      } else {
        setErrorMsg(result.error ?? "Erro ao descartar lançamento.");
      }
      setBusyId(null);
    });
  };

  const getBadgeStyles = (score: number) => {
    if (score >= 95) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/30";
    }
    if (score >= 85) {
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/30";
    }
    return "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-800/30";
  };

  const getStatusLabel = (score: number, status: string) => {
    if (score >= 95) return "CONFIRMADO";
    if (score >= 85) return "INFERIDO";
    return status || "DESCONHECIDO";
  };

  if (lines.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <Check className="mx-auto h-12 w-12 text-emerald-500 bg-emerald-50 p-2.5 rounded-full dark:bg-emerald-950/50" />
        <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">
          Nenhuma sugestão pendente
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          Todas as linhas de extrato importadas já foram analisadas e conciliadas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/30 dark:bg-red-950/10 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800/80 dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/80 text-xs font-bold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                <th className="px-4 py-2.5">Fluxo</th>
                <th className="px-4 py-2.5">Data</th>
                <th className="px-4 py-2.5">Descrição Bruta / Sugerido</th>
                <th className="px-4 py-2.5">CNPJ/CPF</th>
                <th className="px-4 py-2.5">Valor</th>
                <th className="px-4 py-2.5">Confiança</th>
                <th className="px-4 py-2.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {lines.map((line) => {
                const isIncome = line.originId !== null;
                return (
                  <tr key={line.id} className="transition-all hover:bg-slate-50/80 dark:hover:bg-slate-900/10">
                    <td className="whitespace-nowrap px-4 py-2">
                      <span className={cn(
                        "inline-flex p-1.5 rounded-lg border",
                        isIncome 
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/10 dark:text-emerald-400 dark:border-emerald-900/30"
                          : "bg-red-50 text-red-600 border-red-100 dark:bg-red-950/10 dark:text-red-400 dark:border-red-900/30"
                      )}>
                        {isIncome ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-slate-600 dark:text-slate-400 font-medium">
                      {new Date(line.date).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-950 dark:text-slate-100">
                          {line.suggestedName || "—"}
                        </span>
                        {line.reconciliationMatchId && (
                          <span className="inline-flex items-center gap-1 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 px-1.5 py-0.5 text-[10px] font-bold tracking-wide">
                            CONCILIAÇÃO DISPONÍVEL
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5 max-w-sm truncate">
                        {line.description}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-slate-500 font-mono text-xs dark:text-slate-400">
                      {line.cnpjCpf || "—"}
                    </td>
                    <td className={cn(
                      "whitespace-nowrap px-4 py-2 font-semibold text-base",
                      isIncome ? "text-emerald-700 dark:text-emerald-400" : "text-slate-950 dark:text-slate-100"
                    )}>
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                        Math.abs(line.amount)
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-semibold tracking-wider",
                        getBadgeStyles(line.score)
                      )}>
                        {getStatusLabel(line.score, line.status)} ({line.score}%)
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right">
                      <div className="inline-flex items-center gap-2">
                        {line.reconciliationMatchId ? (
                          <button
                            type="button"
                            onClick={() => handleApprove(line.id)}
                            disabled={busyId === line.id || isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition-all focus:ring-2 focus:ring-indigo-500"
                          >
                            {busyId === line.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Link2 className="h-3.5 w-3.5" />
                            )}
                            Conciliar Lançamento
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleApprove(line.id)}
                            disabled={busyId === line.id || isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold shadow-sm transition-all focus:ring-2 focus:ring-slate-950"
                          >
                            {busyId === line.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            Aprovar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleReject(line.id)}
                          disabled={busyId === line.id || isPending}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition-all focus:ring-2 focus:ring-red-500"
                        >
                          {busyId === line.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                          Rejeitar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
