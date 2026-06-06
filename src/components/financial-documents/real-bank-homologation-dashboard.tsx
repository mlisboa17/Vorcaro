"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Play, Upload } from "lucide-react";
import { SettingsToastProvider, useSettingsToast } from "@/components/settings/settings-toast";
import type { RealBankHomologReport } from "@/modules/statement-layout-training/homologation/real-bank/real-bank-homologation.types";
import { cn } from "@/lib/utils/cn";

const BANK_FOLDERS = [
  "Bradesco_PJ",
  "Santander_PJ",
  "Itau_PJ",
  "BancoBrasil_PJ",
  "Caixa_PJ",
  "Sicredi",
  "Sicoob",
  "Inter_PJ",
  "C6_PJ",
  "Nubank_PJ",
  "BTG_PJ",
  "Stone",
  "MercadoPago",
  "PagBank",
  "Safra_PJ",
] as const;

function statusBadge(status: string) {
  switch (status) {
    case "PASSED":
      return "bg-emerald-50 text-emerald-800";
    case "WARNING":
      return "bg-amber-50 text-amber-900";
    case "FAILED":
      return "bg-red-50 text-red-800";
    case "PENDING":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-50 text-slate-500";
  }
}

function RealBankHomologationInner() {
  const { pushToast } = useSettingsToast();
  const [report, setReport] = useState<RealBankHomologReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [uploadBank, setUploadBank] = useState<string>(BANK_FOLDERS[0]);
  const [uploadBusy, setUploadBusy] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/import/statement-layouts/homologation/report");
      if (!res.ok) throw new Error("Falha ao carregar");
      const data = (await res.json()) as { available: boolean; report?: RealBankHomologReport };
      setReport(data.available && data.report ? data.report : null);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  async function runHomologation() {
    setRunning(true);
    try {
      const res = await fetch("/api/import/statement-layouts/homologation/run", { method: "POST" });
      if (!res.ok) throw new Error("Falha na homologação");
      const data = (await res.json()) as { report: RealBankHomologReport };
      setReport(data.report);
      pushToast("success", "Homologação executada. Relatório atualizado.");
    } catch {
      pushToast("error", "Não foi possível executar a homologação.");
    } finally {
      setRunning(false);
    }
  }

  async function uploadFile(file: File) {
    setUploadBusy(true);
    try {
      const form = new FormData();
      form.set("bankFolder", uploadBank);
      form.set("file", file);
      const res = await fetch("/api/import/statement-layouts/homologation/upload", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Falha no upload");
      }
      pushToast("success", `Arquivo salvo em homologation/banks/${uploadBank}/ (local).`);
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploadBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Homologação — Extratos Reais</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Valide o motor de treinamento com arquivos reais ou anonimizados. Dados sensíveis não são
          commitados — use a pasta local <code>homologation/banks/</code>.
        </p>
        <nav className="mt-4 flex flex-wrap gap-2 text-sm">
          {(
            [
              ["/dashboard/import/layout-training", "Modelos treinados"],
              ["/dashboard/import/layout-training/homologation", "Homologação real"],
            ] as const
          ).map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-lg border px-3 py-1.5",
                href.includes("homologation")
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="text-lg font-medium text-slate-900">Executar homologação</h2>
        <p className="text-sm text-slate-600">
          Coloque arquivos nos slots (<code>pdf-curto.pdf</code>, <code>pdf-longo.pdf</code>,{" "}
          <code>extrato.csv</code>, etc.) ou faça upload abaixo. Formatos ausentes aparecem como
          &quot;não disponível&quot;.
        </p>
        <button
          type="button"
          disabled={running}
          onClick={() => void runHomologation()}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Rodar homologação
        </button>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="text-lg font-medium text-slate-900">Upload por banco</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <label className="block text-sm">
            <span className="text-slate-700">Banco</span>
            <select
              className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={uploadBank}
              onChange={(e) => setUploadBank(e.target.value)}
            >
              {BANK_FOLDERS.map((b) => (
                <option key={b} value={b}>
                  {b.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50">
            <Upload className="h-4 w-4" />
            {uploadBusy ? "Enviando…" : "Selecionar arquivo"}
            <input
              type="file"
              className="hidden"
              accept=".pdf,.ofx,.csv,.xls,.xlsx"
              disabled={uploadBusy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadFile(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <p className="text-xs text-slate-500">
          Renomeie para o slot esperado (ex.: pdf-longo.pdf) ou mantenha o nome — o arquivo será
          salvo na pasta do banco selecionado.
        </p>
      </section>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : report ? (
        <>
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="font-medium text-slate-900">Resumo</p>
            <p className="mt-1">
              Pronto para merge:{" "}
              <strong>{report.summary.readyForMerge ? "Sim" : "Não"}</strong> — PASSED:{" "}
              {report.summary.passed}, WARNING: {report.summary.warning}, FAILED:{" "}
              {report.summary.failed}, não disponíveis: {report.summary.notAvailable}
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-medium text-slate-900">Bancos mínimos</h2>
            <ul className="space-y-2">
              {report.minimumBanks.map((b) => (
                <li
                  key={b.bankFolder}
                  className={cn(
                    "rounded-lg border px-4 py-3 text-sm",
                    statusBadge(b.status),
                  )}
                >
                  <strong>{b.bankFolder.replace(/_/g, " ")}</strong> — {b.status}: {b.detail}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-medium text-slate-900">Detalhes</h2>
            <div className="space-y-3">
              {report.results.map((r) => (
                <article
                  key={`${r.bankFolder}-${r.formatSlot}`}
                  className="rounded-xl border border-slate-200 bg-white p-4 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">
                      {r.bankLabel} — {r.formatLabel}
                    </p>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusBadge(r.status))}>
                      {r.status}
                    </span>
                  </div>
                  {r.availability === "not_available" ? (
                    <p className="mt-2 text-slate-500">Não disponível</p>
                  ) : (
                    <>
                      <p className="mt-1 text-slate-600">Arquivo: {r.fileName}</p>
                      {r.metrics ? (
                        <p className="mt-2 text-slate-700">
                          Encontradas: {r.metrics.total} · Reconhecidas: {r.metrics.recognized} ·
                          Revisar: {r.metrics.needsReview} · Taxa: {r.metrics.recognitionRate}% ·
                          Similaridade: {r.similarity?.toFixed(1) ?? "—"}%
                        </p>
                      ) : null}
                      {r.problems.length > 0 ? (
                        <ul className="mt-2 list-disc pl-5 text-amber-800">
                          {r.problems.map((p) => (
                            <li key={p}>{p}</li>
                          ))}
                        </ul>
                      ) : null}
                    </>
                  )}
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <p className="text-sm text-slate-600">
          Nenhum relatório ainda. Execute a homologação ou adicione arquivos em{" "}
          <code>homologation/banks/</code>.
        </p>
      )}
    </div>
  );
}

export function RealBankHomologationDashboard() {
  return (
    <SettingsToastProvider>
      <RealBankHomologationInner />
    </SettingsToastProvider>
  );
}
