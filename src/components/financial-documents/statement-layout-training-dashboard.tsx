"use client";



import Link from "next/link";

import { useCallback, useEffect, useState } from "react";

import { Loader2, Trash2 } from "lucide-react";

import { SettingsToastProvider, useSettingsToast } from "@/components/settings/settings-toast";

import type {

  StatementLayoutApprovalStatus,

  StatementLayoutModelView,

  StatementLayoutRiskLevel,

} from "@/modules/statement-layout-training/domain/types/statement-layout-model.types";

import { cn } from "@/lib/utils/cn";



function formatPercent(value: number) {

  return `${value.toFixed(1)}%`;

}



function formatDate(value: string | null) {

  if (!value) return "—";

  return new Date(value).toLocaleString("pt-BR");

}



function formatSimilarity(value: number | null) {

  if (value == null) return "—";

  return formatPercent(value);

}



const APPROVAL_LABELS: Record<StatementLayoutApprovalStatus, string> = {

  TESTING: "Em teste",

  APPROVED: "Aprovado",

  DISABLED: "Desabilitado",

  REJECTED: "Rejeitado",

};



const RISK_LABELS: Record<StatementLayoutRiskLevel, string> = {

  LOW: "Baixo",

  MEDIUM: "Médio",

  HIGH: "Alto",

};



function approvalClass(status: StatementLayoutApprovalStatus) {

  switch (status) {

    case "APPROVED":

      return "bg-emerald-50 text-emerald-800";

    case "TESTING":

      return "bg-blue-50 text-blue-800";

    case "REJECTED":

      return "bg-red-50 text-red-800";

    default:

      return "bg-slate-100 text-slate-600";

  }

}



function riskClass(level: StatementLayoutRiskLevel) {

  switch (level) {

    case "LOW":

      return "text-emerald-700";

    case "MEDIUM":

      return "text-amber-700";

    case "HIGH":

      return "text-red-700";

  }

}



function StatementLayoutTrainingInner() {

  const { pushToast } = useSettingsToast();

  const [loading, setLoading] = useState(true);

  const [items, setItems] = useState<StatementLayoutModelView[]>([]);

  const [busyId, setBusyId] = useState<string | null>(null);

  const [realHomolog, setRealHomolog] = useState<{

    available: boolean;

    summary?: { readyForMerge: boolean; passed: number; failed: number };

  } | null>(null);



  const load = useCallback(async () => {

    setLoading(true);

    try {

      const res = await fetch("/api/import/statement-layouts");

      if (!res.ok) throw new Error("Falha ao carregar modelos");

      const data = (await res.json()) as { items: StatementLayoutModelView[] };

      setItems(data.items);

    } catch {

      pushToast("error", "Não foi possível carregar os modelos de extrato.");

    } finally {

      setLoading(false);

    }

  }, [pushToast]);



  useEffect(() => {

    void load();

    void fetch("/api/import/statement-layouts/homologation/report")

      .then((res) => (res.ok ? res.json() : { available: false }))

      .then((data) =>

        setRealHomolog(

          data.available

            ? { available: true, summary: data.report?.summary }

            : { available: false },

        ),

      )

      .catch(() => setRealHomolog({ available: false }));

  }, [load]);



  async function action(id: string, path: string, successMsg: string) {

    setBusyId(id);

    try {

      const res = await fetch(path, { method: "POST" });

      if (!res.ok) {

        const body = (await res.json().catch(() => null)) as { error?: string } | null;

        throw new Error(body?.error ?? "Falha");

      }

      pushToast("success", successMsg);

      await load();

    } catch (err) {

      pushToast("error", err instanceof Error ? err.message : "Operação falhou");

    } finally {

      setBusyId(null);

    }

  }



  async function toggleStatus(item: StatementLayoutModelView) {

    setBusyId(item.id);

    try {

      const res = await fetch(`/api/import/statement-layouts/${item.id}`, {

        method: "PATCH",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({

          status: item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",

        }),

      });

      if (!res.ok) throw new Error("Falha ao atualizar");

      pushToast("success", "Status operacional atualizado.");

      await load();

    } catch {

      pushToast("error", "Não foi possível atualizar o modelo.");

    } finally {

      setBusyId(null);

    }

  }



  async function remove(item: StatementLayoutModelView) {

    if (!window.confirm(`Excluir o modelo "${item.layoutLabel}"?`)) return;

    setBusyId(item.id);

    try {

      const res = await fetch(`/api/import/statement-layouts/${item.id}`, { method: "DELETE" });

      if (!res.ok) throw new Error("Falha ao excluir");

      pushToast("success", "Modelo excluído.");

      await load();

    } catch {

      pushToast("error", "Não foi possível excluir o modelo.");

    } finally {

      setBusyId(null);

    }

  }



  return (

    <div className="mx-auto max-w-7xl space-y-6 p-6">

      <header>

        <h1 className="text-2xl font-semibold text-slate-900">Treinamento de Extratos</h1>

        <p className="mt-1 max-w-3xl text-sm text-slate-600">

          Modelos aprendidos a partir dos seus extratos. Novos modelos iniciam em{" "}

          <strong>TESTING</strong> até homologação e revisão humana.

        </p>

        <nav className="mt-4 flex flex-wrap gap-2 text-sm">

          {(

            [

              ["/dashboard/import", "Upload"],

              ["/dashboard/import/layout-training", "Modelos"],

              ["/dashboard/import/layout-training/homologation", "Homologação real"],

              ["/dashboard/import/review", "Revisão"],

            ] as const

          ).map(([href, label]) => (

            <Link

              key={href}

              href={href}

              className={cn(

                "rounded-lg border px-3 py-1.5",

                href === "/dashboard/import/layout-training"

                  ? "border-slate-900 bg-slate-900 text-white"

                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",

              )}

            >

              {label}

            </Link>

          ))}

        </nav>

      </header>



      <section className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">

        <Link

          href="/dashboard/import/layout-training/homologation"

          className="rounded-lg bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800"

        >

          Ver relatório de homologação

        </Link>

        {realHomolog?.available && realHomolog.summary ? (

          <span className="text-slate-700">

            Merge: {realHomolog.summary.readyForMerge ? "OK" : "Pendente"} —{" "}

            {realHomolog.summary.passed} passed / {realHomolog.summary.failed} failed

          </span>

        ) : (

          <span className="text-slate-500">Nenhum relatório de bancos reais ainda</span>

        )}

      </section>



      {loading ? (

        <div className="flex min-h-[30vh] items-center justify-center">

          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />

        </div>

      ) : items.length === 0 ? (

        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">

          <p className="font-medium text-slate-900">Nenhum modelo treinado ainda</p>

          <p className="mt-2">

            Importe um extrato ou rode{" "}

            <Link href="/dashboard/import/layout-training/homologation" className="underline">

              homologação real

            </Link>

            .

          </p>

        </div>

      ) : (

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">

          <table className="min-w-full text-sm">

            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">

              <tr>

                <th className="px-3 py-3">Banco</th>

                <th className="px-3 py-3">Formato</th>

                <th className="px-3 py-3">Layout</th>

                <th className="px-3 py-3">Qualidade</th>

                <th className="px-3 py-3">Risco</th>

                <th className="px-3 py-3">Similaridade</th>

                <th className="px-3 py-3">Acerto</th>

                <th className="px-3 py-3">Imports</th>

                <th className="px-3 py-3">Versão</th>

                <th className="px-3 py-3">Operacional</th>

                <th className="px-3 py-3">Ações</th>

              </tr>

            </thead>

            <tbody>

              {items.map((item) => (

                <tr key={item.id} className="border-t border-slate-100 align-top">

                  <td className="px-3 py-3">

                    <p className="font-medium text-slate-900">{item.bankName}</p>

                    <p className="text-xs text-slate-500">{item.fileFormat}</p>

                  </td>

                  <td className="px-3 py-3">{item.accountType ?? item.profile}</td>

                  <td className="px-3 py-3">{item.layoutLabel}</td>

                  <td className="px-3 py-3">

                    <span

                      className={cn(

                        "rounded-full px-2 py-0.5 text-xs font-medium",

                        approvalClass(item.approvalStatus),

                      )}

                    >

                      {APPROVAL_LABELS[item.approvalStatus]}

                    </span>

                  </td>

                  <td className={cn("px-3 py-3 font-medium", riskClass(item.riskLevel))}>

                    {RISK_LABELS[item.riskLevel]}

                  </td>

                  <td className="px-3 py-3">{formatSimilarity(item.lastSimilarityScore)}</td>

                  <td className="px-3 py-3">{formatPercent(item.accuracyRate)}</td>

                  <td className="px-3 py-3">{item.realImportCount}</td>

                  <td className="px-3 py-3">v{item.version}</td>

                  <td className="px-3 py-3">

                    <span

                      className={cn(

                        "rounded-full px-2 py-0.5 text-xs",

                        item.status === "ACTIVE" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100",

                      )}

                    >

                      {item.status === "ACTIVE" ? "Ativo" : "Inativo"}

                    </span>

                    <p className="mt-1 text-xs text-slate-500">{formatDate(item.lastUsedAt)}</p>

                  </td>

                  <td className="px-3 py-3">

                    <div className="flex max-w-[14rem] flex-wrap gap-1">

                      {item.approvalStatus === "TESTING" ? (

                        <button

                          type="button"

                          disabled={busyId === item.id}

                          onClick={() =>

                            void action(

                              item.id,

                              `/api/import/statement-layouts/${item.id}/promote`,

                              "Modelo promovido para APPROVED",

                            )

                          }

                          className="rounded border border-emerald-200 px-2 py-0.5 text-xs text-emerald-800 hover:bg-emerald-50"

                        >

                          Promover

                        </button>

                      ) : null}

                      {item.approvalStatus !== "REJECTED" ? (

                        <button

                          type="button"

                          disabled={busyId === item.id}

                          onClick={() =>

                            void action(

                              item.id,

                              `/api/import/statement-layouts/${item.id}/reject`,

                              "Modelo rejeitado",

                            )

                          }

                          className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"

                        >

                          Rejeitar

                        </button>

                      ) : null}

                      {item.parentModelId ? (

                        <button

                          type="button"

                          disabled={busyId === item.id}

                          onClick={() =>

                            void action(

                              item.id,

                              `/api/import/statement-layouts/${item.id}/rollback`,

                              "Versão anterior restaurada",

                            )

                          }

                          className="rounded border border-amber-200 px-2 py-0.5 text-xs text-amber-900 hover:bg-amber-50"

                        >

                          Rollback

                        </button>

                      ) : null}

                      <button

                        type="button"

                        disabled={busyId === item.id}

                        onClick={() => void toggleStatus(item)}

                        className="rounded border border-slate-200 px-2 py-0.5 text-xs hover:bg-slate-50"

                      >

                        {item.status === "ACTIVE" ? "Desativar" : "Ativar"}

                      </button>

                      <button

                        type="button"

                        disabled={busyId === item.id}

                        onClick={() => void remove(item)}

                        className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"

                      >

                        <Trash2 className="h-3 w-3" />

                        Excluir

                      </button>

                    </div>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      )}

    </div>

  );

}



export function StatementLayoutTrainingDashboard() {

  return (

    <SettingsToastProvider>

      <StatementLayoutTrainingInner />

    </SettingsToastProvider>

  );

}

