"use client";

import { AlertTriangle, CalendarX, PiggyBank, TrendingDown, Wallet } from "lucide-react";
import type { ExecutiveDashboardDTO } from "@/types/executive-dashboard";
import { ExecutiveSkeleton, formatBRL, formatDateBR } from "./executive-shared";

interface ExecutiveSummaryCardsProps {
  data: ExecutiveDashboardDTO | null;
  loading?: boolean;
}

const CARDS = [
  { key: "saldoAtual", label: "Saldo Atual", icon: Wallet },
  { key: "saldo30", label: "Saldo Projetado 30 dias", icon: Wallet },
  { key: "patrimonio", label: "Patrimônio Líquido", icon: PiggyBank },
  { key: "despesasMes", label: "Despesas do Mês (Caixa)", icon: TrendingDown },
  { key: "orcamento", label: "Orçamento Restante", icon: PiggyBank },
  { key: "dataCritica", label: "Data Crítica de Caixa", icon: CalendarX },
] as const;

export function ExecutiveSummaryCards({ data, loading }: ExecutiveSummaryCardsProps) {
  if (loading || !data) {
    return (
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {CARDS.map((card) => (
          <ExecutiveSkeleton key={card.key} className="h-28" />
        ))}
      </section>
    );
  }

  const criticalDate = data.cash.primeiraDataNegativa;
  const orcamentoRestante = data.budget.restante;

  const values: Record<string, { display: string; critical?: boolean }> = {
    saldoAtual: { display: formatBRL(data.cash.saldoAtual) },
    saldo30: { display: formatBRL(data.cash.saldoProjetado30Dias) },
    patrimonio: { display: formatBRL(data.patrimony.patrimonioLiquido) },
    despesasMes: { display: formatBRL(data.month.despesasCaixa) },
    orcamento: {
      display: formatBRL(orcamentoRestante),
      critical: orcamentoRestante < 0,
    },
    dataCritica: {
      display: criticalDate ? formatDateBR(criticalDate) : "Sem risco",
      critical: Boolean(criticalDate),
    },
  };

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const value = values[card.key];
        const isCritical = value.critical;

        return (
          <article
            key={card.key}
            className={`rounded-xl border bg-white p-5 shadow-sm ${
              isCritical ? "border-red-300 bg-red-50/60" : "border-slate-200"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p
                className={`text-xs font-semibold uppercase tracking-wide ${
                  isCritical ? "text-red-700" : "text-slate-500"
                }`}
              >
                {card.label}
              </p>
              <Icon className={`h-4 w-4 shrink-0 ${isCritical ? "text-red-600" : "text-slate-400"}`} />
            </div>
            <p
              className={`mt-2 text-xl font-bold leading-tight sm:text-2xl ${
                isCritical ? "text-red-800" : "text-slate-900"
              }`}
            >
              {value.display}
            </p>
            {card.key === "dataCritica" && isCritical ? (
              <p className="mt-2 flex items-center gap-1 text-xs font-medium text-red-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                Liquidez em risco
              </p>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}
