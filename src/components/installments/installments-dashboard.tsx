"use client";

import { CreditCard, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { InstallmentGroupDto } from "@/modules/installments/domain/types/installment-group.dto";
import { cn } from "@/lib/utils/cn";
import { InstallmentGroupDetailModal } from "./installment-group-detail-modal";

function formatBrl(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function StatusBadge({ status }: { status: InstallmentGroupDto["status"] }) {
  const isActive = status === "ATIVO";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
        isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700",
      )}
    >
      {status}
    </span>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export function InstallmentsDashboard() {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<InstallmentGroupDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/installments", { credentials: "include" });
      if (!res.ok) throw new Error("Falha ao carregar parcelamentos");
      setGroups((await res.json()) as InstallmentGroupDto[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    let parceladoTotal = 0;
    let valorJaPago = 0;
    let valorRestante = 0;
    let parcelasRestantes = 0;
    for (const g of groups) {
      parceladoTotal += g.valorTotal;
      valorJaPago += g.valorPago;
      valorRestante += g.valorRestante;
      parcelasRestantes += g.parcelasRestantes;
    }
    return { parceladoTotal, valorJaPago, valorRestante, parcelasRestantes };
  }, [groups]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p className="rounded-lg bg-rose-50 px-4 py-3 text-rose-700">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Central de Parcelamentos</h1>
        <p className="text-sm text-slate-500">
          Visão derivada do extrato — sem alterar lançamentos existentes
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Parcelado total" value={formatBrl(summary.parceladoTotal)} />
        <MetricCard title="Valor já pago" value={formatBrl(summary.valorJaPago)} />
        <MetricCard title="Valor restante" value={formatBrl(summary.valorRestante)} />
        <MetricCard title="Parcelas restantes" value={String(summary.parcelasRestantes)} />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Descrição</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Parcela</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Valor total</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Pago</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Restante</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Cartão</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Categoria</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Nenhum parcelamento encontrado. Compras parceladas no cartão aparecem aqui
                    automaticamente.
                  </td>
                </tr>
              ) : (
                groups.map((g) => (
                  <tr
                    key={g.installmentGroup}
                    className="cursor-pointer hover:bg-violet-50/60"
                    onClick={() => setSelectedGroupId(g.installmentGroup)}
                  >
                    <td className="max-w-xs truncate px-4 py-3 font-medium text-slate-900">
                      <span className="inline-flex flex-col gap-0.5">
                        <span>{g.descricao}</span>
                        {!g.parcelamentoEstruturado ? (
                          <span className="text-xs font-normal text-amber-700">
                            parcelamento não estruturado
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {g.parcelaAtual != null
                        ? `${g.parcelaAtual} / ${g.totalParcelas}`
                        : `— / ${g.totalParcelas}`}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-800">{formatBrl(g.valorTotal)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700">{formatBrl(g.valorPago)}</td>
                    <td className="px-4 py-3 text-right text-amber-800">
                      {formatBrl(g.valorRestante)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {g.cartao ? (
                        <span className="inline-flex items-center gap-1">
                          <CreditCard className="h-3.5 w-3.5" />
                          {g.cartao}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{g.categoria ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={g.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <InstallmentGroupDetailModal
        groupId={selectedGroupId}
        onClose={() => setSelectedGroupId(null)}
      />
    </div>
  );
}
