"use client";

import Link from "next/link";
import { WalletCards } from "lucide-react";
import type { ExecutiveDashboardDTO } from "@/types/executive-dashboard";

type Props = {
  installments: ExecutiveDashboardDTO["installments"] | undefined;
};

function formatBrl(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ExecutiveInstallmentsCard({ installments }: Props) {
  if (!installments) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <WalletCards className="h-4 w-4 text-violet-600" />
          Parcelamentos
        </h2>
        <Link
          href="/dashboard/installments"
          className="text-xs font-medium text-violet-600 hover:underline"
        >
          Ver central
        </Link>
      </div>

      <p className="text-2xl font-bold text-slate-900">{formatBrl(installments.valorRestante)}</p>
      <p className="text-xs text-slate-500">valor restante em compras parceladas</p>

      <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
        <p>
          <span className="font-medium text-slate-800">Planos ativos:</span>{" "}
          {installments.planosAtivos}
        </p>
        <p>
          <span className="font-medium text-slate-800">Parcelas a vencer (30d):</span>{" "}
          {installments.parcelasAVencer30Dias}
        </p>
      </div>

      {installments.cartaoMaiorConcentracao ? (
        <p className="mt-3 rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-900">
          Maior concentração: <strong>{installments.cartaoMaiorConcentracao.nome}</strong> (
          {installments.cartaoMaiorConcentracao.percentualDoTotal}% do restante —{" "}
          {formatBrl(installments.cartaoMaiorConcentracao.valorRestante)})
        </p>
      ) : (
        <p className="mt-3 text-xs text-slate-400">Sem concentração relevante por cartão.</p>
      )}
    </section>
  );
}
