"use client";

import Link from "next/link";
import {
  Inbox,
  CalendarClock,
  Landmark,
  Handshake,
  PiggyBank,
  FileUp,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import type { ExecutiveDashboardDTO } from "@/types/executive-dashboard";
import { SettingsToastProvider } from "@/components/settings/settings-toast";

function formatBRL(val: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val);
}

interface ExecutiveDashboardInnerProps {
  data: ExecutiveDashboardDTO;
  patrimonyConsolidation?: {
    patrimonioLiquido: number;
    variationPercent: number;
  };
}

function ExecutiveDashboardInner({ data, patrimonyConsolidation }: ExecutiveDashboardInnerProps) {
  // Safe defaults if data fields are missing
  const cash = data?.cash || { saldoAtual: 0, saldoProjetado30Dias: 0, saldoProjetado90Dias: 0, primeiraDataNegativa: null };
  const month = data?.month || { receitas: 0, despesasCaixa: 0, despesasDre: 0, saldoMes: 0 };
  const patrimony = data?.patrimony || { totalAtivos: 0, totalPassivos: 0, patrimonioLiquido: 0 };
  const consortium = data?.consortium || { consorciosAtivos: 0, creditoTotalConsorcio: 0, valorPagoConsorcio: 0 };
  const budget = data?.budget || { totalPlanejado: 0, totalRealizadoDre: 0, restante: 0, categoriasEstouradas: 0, categoriasAtencao: 0 };

  return (
    <div className="space-y-3">
      <header className="border-b border-slate-200/80 pb-2">
        <h1 className="text-lg font-bold tracking-tight text-slate-900">Painel Executivo</h1>
        <p className="mt-0.5 text-[11px] text-slate-500">
          KPI Launchpad corporativo de alta densidade de informação no padrão SAP Fiori Horizon.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Caixa Financeiro */}
        <Link
          href="/dashboard/inbox"
          className="group block rounded-md border border-slate-200 bg-white p-3 shadow-sm transition-all duration-150 hover:border-sky-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 transition-colors group-hover:text-sky-700">
              Caixa Financeiro
            </span>
            <Inbox className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-sky-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-lg font-bold tracking-tight text-slate-900">
              {formatBRL(cash.saldoAtual)}
            </span>
            {month.saldoMes >= 0 ? (
              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                <TrendingUp className="h-2.5 w-2.5" /> +{formatBRL(month.saldoMes)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                <TrendingDown className="h-2.5 w-2.5" /> {formatBRL(month.saldoMes)}
              </span>
            )}
          </div>
          <div className="mt-2 border-t border-slate-100 pt-1.5 flex items-center justify-between text-[10px] text-slate-500">
            <div>
              <span className="font-semibold text-emerald-600">▲ {formatBRL(month.receitas)}</span>
              <span className="mx-1 text-slate-300">|</span>
              <span className="font-semibold text-rose-600">▼ {formatBRL(month.despesasCaixa)}</span>
            </div>
            <span className="flex items-center gap-0.5 text-sky-600 group-hover:underline">
              Acessar <ArrowRight className="h-2.5 w-2.5" />
            </span>
          </div>
        </Link>

        {/* Card 2: Fluxo de Caixa */}
        <Link
          href="/dashboard/cashflow"
          className="group block rounded-md border border-slate-200 bg-white p-3 shadow-sm transition-all duration-150 hover:border-sky-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 transition-colors group-hover:text-sky-700">
              Fluxo de Caixa
            </span>
            <CalendarClock className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-sky-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-lg font-bold tracking-tight text-slate-900">
              {formatBRL(cash.saldoProjetado30Dias)}
            </span>
            {cash.primeiraDataNegativa ? (
              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                <AlertTriangle className="h-2.5 w-2.5 text-rose-500" /> Caixa Negativo
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" /> Saudável
              </span>
            )}
          </div>
          <div className="mt-2 border-t border-slate-100 pt-1.5 flex items-center justify-between text-[10px] text-slate-500">
            <span>Projetado 90d: <strong className="text-slate-700 font-semibold">{formatBRL(cash.saldoProjetado90Dias)}</strong></span>
            <span className="flex items-center gap-0.5 text-sky-600 group-hover:underline">
              Ver projeção <ArrowRight className="h-2.5 w-2.5" />
            </span>
          </div>
        </Link>

        {/* Card 3: Patrimônio */}
        <Link
          href="/dashboard/settings?tab=ativos"
          className="group block rounded-md border border-slate-200 bg-white p-3 shadow-sm transition-all duration-150 hover:border-sky-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 transition-colors group-hover:text-sky-700">
              Patrimônio
            </span>
            <Landmark className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-sky-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-lg font-bold tracking-tight text-slate-900">
              {formatBRL(patrimonyConsolidation ? patrimonyConsolidation.patrimonioLiquido : patrimony.patrimonioLiquido)}
            </span>
            {patrimonyConsolidation ? (
              <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold border ${
                patrimonyConsolidation.variationPercent >= 0
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : "bg-rose-50 text-rose-700 border-rose-100"
              }`}>
                {patrimonyConsolidation.variationPercent >= 0 ? "+" : ""}{patrimonyConsolidation.variationPercent}% este mês
              </span>
            ) : patrimony.patrimonioLiquido >= 0 ? (
              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                Líquido Positivo
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                Líquido Negativo
              </span>
            )}
          </div>
          <div className="mt-2 border-t border-slate-100 pt-1.5 flex items-center justify-between text-[10px] text-slate-500">
            <div>
              <span>Ativos: <strong className="text-slate-700 font-semibold">{formatBRL(patrimony.totalAtivos)}</strong></span>
              <span className="mx-1 text-slate-300">|</span>
              <span>Passivos: <strong className="text-slate-700 font-semibold">{formatBRL(patrimony.totalPassivos)}</strong></span>
            </div>
            <span className="flex items-center gap-0.5 text-sky-600 group-hover:underline">
              Detalhar <ArrowRight className="h-2.5 w-2.5" />
            </span>
          </div>
        </Link>

        {/* Card 4: Consórcios */}
        <Link
          href="/dashboard/settings?tab=consorcios"
          className="group block rounded-md border border-slate-200 bg-white p-3 shadow-sm transition-all duration-150 hover:border-sky-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 transition-colors group-hover:text-sky-700">
              Consórcios
            </span>
            <Handshake className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-sky-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-lg font-bold tracking-tight text-slate-900">
              {formatBRL(consortium.creditoTotalConsorcio)}
            </span>
            <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold bg-sky-50 text-sky-700 border border-sky-100">
              {consortium.consorciosAtivos} Ativos
            </span>
          </div>
          <div className="mt-2 border-t border-slate-100 pt-1.5 flex items-center justify-between text-[10px] text-slate-500">
            <span>Total Pago: <strong className="text-slate-700 font-semibold">{formatBRL(consortium.valorPagoConsorcio)}</strong></span>
            <span className="flex items-center gap-0.5 text-sky-600 group-hover:underline">
              Ver carteira <ArrowRight className="h-2.5 w-2.5" />
            </span>
          </div>
        </Link>

        {/* Card 5: Orçamentos */}
        {(() => {
          const now = new Date();
          const currentDay = now.getDate();
          const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
          const percentTempo = (currentDay / totalDays) * 100;

          const percentConsumido = budget.totalPlanejado > 0 
            ? Math.round((budget.totalRealizadoDre / budget.totalPlanejado) * 100)
            : 0;

          const isAbovePacing = (percentConsumido - percentTempo) > 15;

          return (
            <Link
              href="/dashboard/settings?tab=orcamentos"
              className={`group block rounded-md border p-3 shadow-sm transition-all duration-150 hover:shadow-md ${
                percentConsumido > 100
                  ? "border-rose-200 bg-white hover:border-rose-300"
                  : percentConsumido > 85
                  ? "border-amber-200 bg-white hover:border-amber-300"
                  : "border-slate-200 bg-white hover:border-sky-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 transition-colors group-hover:text-sky-700">
                  Orçamentos
                </span>
                <PiggyBank className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-sky-500" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-lg font-bold tracking-tight text-slate-900">
                  {formatBRL(budget.totalPlanejado)}
                </span>
                <div className="flex flex-col items-end gap-1">
                  {percentConsumido > 100 ? (
                    <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                      {percentConsumido}% consumido
                    </span>
                  ) : percentConsumido > 85 ? (
                    <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                      {percentConsumido}% consumido
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {percentConsumido}% consumido
                    </span>
                  )}
                  {isAbovePacing && (
                    <span className="inline-flex items-center gap-0.5 rounded px-1 py-0.2 text-[8px] font-semibold bg-rose-50 text-rose-700 border border-rose-100/60 leading-none">
                      Acima do ritmo
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-2 border-t border-slate-100 pt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                <div>
                  <span>Realizado: <strong className="text-slate-700 font-semibold">{formatBRL(budget.totalRealizadoDre)}</strong></span>
                  <span className="mx-1 text-slate-300">|</span>
                  <span>Restante: <strong className={budget.restante >= 0 ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>{formatBRL(budget.restante)}</strong></span>
                </div>
                <span className="flex items-center gap-0.5 text-sky-600 group-hover:underline">
                  Planejamento <ArrowRight className="h-2.5 w-2.5" />
                </span>
              </div>
            </Link>
          );
        })()}

        {/* Card 6: Importar Extrato/Fatura */}
        <Link
          href="/dashboard/statements"
          className="group block rounded-md border border-slate-200 bg-white p-3 shadow-sm transition-all duration-150 hover:border-sky-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 transition-colors group-hover:text-sky-700">
              Importação
            </span>
            <FileUp className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-sky-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-sm font-bold tracking-tight text-slate-700">
              Conciliar Arquivos
            </span>
            <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              OFX, PDF, TXT
            </span>
          </div>
          <div className="mt-2 border-t border-slate-100 pt-1.5 flex items-center justify-between text-[10px] text-slate-500">
            <span>Faturas, extratos e contrapartes</span>
            <span className="flex items-center gap-0.5 text-sky-600 group-hover:underline">
              Importar <ArrowRight className="h-2.5 w-2.5" />
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}

interface ExecutiveDashboardProps {
  initialData: ExecutiveDashboardDTO;
  patrimonyConsolidation?: {
    patrimonioLiquido: number;
    variationPercent: number;
  };
}

export function ExecutiveDashboard({ initialData, patrimonyConsolidation }: ExecutiveDashboardProps) {
  return (
    <SettingsToastProvider>
      <ExecutiveDashboardInner data={initialData} patrimonyConsolidation={patrimonyConsolidation} />
    </SettingsToastProvider>
  );
}

