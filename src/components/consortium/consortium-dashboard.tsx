"use client";

import {
  FormField,
  InstrumentFormModal,
  inputClassName,
} from "@/components/instruments/instrument-form-modal";
import { SettingsConfirmDialog } from "@/components/settings/settings-confirm-dialog";
import { SettingsToastProvider, useSettingsToast } from "@/components/settings/settings-toast";
import { cn } from "@/lib/utils/cn";
import {
  CONSORTIUM_STATUS_LABELS,
  CONSORTIUM_TYPE_LABELS,
  type ConsortiumDto,
  type ConsortiumListResponse,
  type ConsortiumStatus,
  type ConsortiumType,
} from "@/types/consortium";
import { formatBRL } from "@/types/patrimony";
import { Handshake, Loader2, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const TYPES: ConsortiumType[] = ["VEHICLE", "REAL_ESTATE", "SERVICE", "OTHER"];
const STATUSES: ConsortiumStatus[] = [
  "NOT_CONTEMPLATED",
  "CONTEMPLATED",
  "ASSET_ACQUIRED",
  "COMPLETED",
];

const STATUS_BADGE: Record<ConsortiumStatus, string> = {
  NOT_CONTEMPLATED: "bg-slate-100 text-slate-700",
  CONTEMPLATED: "bg-blue-100 text-blue-800",
  ASSET_ACQUIRED: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-zinc-200 text-zinc-700",
};

function ConsortiumDashboardInner() {
  const { pushToast } = useSettingsToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ConsortiumDto[]>([]);
  const [summary, setSummary] = useState<ConsortiumListResponse["summary"] | null>(null);
  const [filterTipo, setFilterTipo] = useState<ConsortiumType | "ALL">("ALL");
  const [filterStatus, setFilterStatus] = useState<ConsortiumStatus | "ALL">("ALL");
  const [showInactive, setShowInactive] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<ConsortiumDto | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConsortiumDto | null>(null);

  const [assets, setAssets] = useState<Array<{ id: string; nome: string }>>([]);
  const [recurring, setRecurring] = useState<Array<{ id: string; descricao: string }>>([]);

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<ConsortiumType>("VEHICLE");
  const [status, setStatus] = useState<ConsortiumStatus>("NOT_CONTEMPLATED");
  const [valorCredito, setValorCredito] = useState("");
  const [valorLance, setValorLance] = useState("0");
  const [valorPago, setValorPago] = useState("0");
  const [valorTaxas, setValorTaxas] = useState("0");
  const [quantidadeParcelas, setQuantidadeParcelas] = useState("60");
  const [parcelasPagas, setParcelasPagas] = useState("0");
  const [dataContratacao, setDataContratacao] = useState("");
  const [dataContemplacao, setDataContemplacao] = useState("");
  const [dataQuitacao, setDataQuitacao] = useState("");
  const [assetId, setAssetId] = useState("");
  const [lancamentoRecorrenteId, setLancamentoRecorrenteId] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const query = showInactive ? "?includeInactive=true" : "";
      const [consortiumRes, assetsRes, recurringRes] = await Promise.all([
        fetch(`/api/consortiums${query}`, { credentials: "include" }),
        fetch("/api/patrimony/assets", { credentials: "include" }),
        fetch("/api/config/lancamentos-recorrentes?limit=200", { credentials: "include" }),
      ]);

      if (!consortiumRes.ok) throw new Error("Falha ao carregar consórcios");

      const payload = (await consortiumRes.json()) as ConsortiumListResponse;
      setItems(payload.items);
      setSummary(payload.summary);

      if (assetsRes.ok) {
        const assetsPayload = (await assetsRes.json()) as { items: Array<{ id: string; nome: string }> };
        setAssets(assetsPayload.items ?? []);
      }

      if (recurringRes.ok) {
        const recurringPayload = (await recurringRes.json()) as {
          items: Array<{ id: string; descricao: string }>;
        };
        setRecurring(
          (recurringPayload.items ?? []).map((row) => ({
            id: row.id,
            descricao: row.descricao,
          })),
        );
      }
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro ao carregar consórcios");
    } finally {
      setLoading(false);
    }
  }, [showInactive, pushToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filterTipo !== "ALL" && item.tipo !== filterTipo) return false;
      if (filterStatus !== "ALL" && item.status !== filterStatus) return false;
      return true;
    });
  }, [items, filterTipo, filterStatus]);

  function openCreate() {
    setEditing(null);
    setNome("");
    setTipo("VEHICLE");
    setStatus("NOT_CONTEMPLATED");
    setValorCredito("");
    setValorLance("0");
    setValorPago("0");
    setValorTaxas("0");
    setQuantidadeParcelas("60");
    setParcelasPagas("0");
    setDataContratacao("");
    setDataContemplacao("");
    setDataQuitacao("");
    setAssetId("");
    setLancamentoRecorrenteId("");
    setFormOpen(true);
  }

  function openEdit(item: ConsortiumDto) {
    setEditing(item);
    setNome(item.nome);
    setTipo(item.tipo);
    setStatus(item.status);
    setValorCredito(String(item.valorCredito));
    setValorLance(String(item.valorLance));
    setValorPago(String(item.valorPago));
    setValorTaxas(String(item.valorTaxas));
    setQuantidadeParcelas(String(item.quantidadeParcelas));
    setParcelasPagas(String(item.parcelasPagas));
    setDataContratacao(item.dataContratacao ?? "");
    setDataContemplacao(item.dataContemplacao ?? "");
    setDataQuitacao(item.dataQuitacao ?? "");
    setAssetId(item.assetId ?? "");
    setLancamentoRecorrenteId(item.lancamentoRecorrenteId ?? "");
    setFormOpen(true);
  }

  async function submitForm() {
    setSubmitting(true);
    try {
      const body = {
        nome,
        tipo,
        status,
        valorCredito: Number(valorCredito),
        valorLance: Number(valorLance),
        valorPago: Number(valorPago),
        valorTaxas: Number(valorTaxas),
        quantidadeParcelas: Number(quantidadeParcelas),
        parcelasPagas: Number(parcelasPagas),
        ...(dataContratacao ? { dataContratacao } : {}),
        ...(dataContemplacao ? { dataContemplacao } : {}),
        ...(dataQuitacao ? { dataQuitacao } : {}),
        assetId: assetId || null,
        lancamentoRecorrenteId: lancamentoRecorrenteId || null,
      };

      const response = await fetch(editing ? `/api/consortiums/${editing.id}` : "/api/consortiums", {
        method: editing ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(typeof payload?.error === "string" ? payload.error : "Falha ao salvar");
      }

      pushToast("success", editing ? "Consórcio atualizado." : "Consórcio criado.");
      setFormOpen(false);
      await loadData();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro ao salvar");
    } finally {
      setSubmitting(false);
    }
  }

  async function registerParcel(item: ConsortiumDto) {
    try {
      const response = await fetch(`/api/consortiums/${item.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrarPagamentoParcela: true }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(typeof payload?.error === "string" ? payload.error : "Falha ao registrar parcela");
      }

      pushToast("success", "Parcela registrada.");
      await loadData();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro ao registrar parcela");
    }
  }

  async function confirmDeleteItem() {
    if (!confirmDelete) return;
    try {
      const response = await fetch(`/api/consortiums/${confirmDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Falha ao excluir consórcio");
      pushToast("success", "Consórcio desativado.");
      setConfirmDelete(null);
      await loadData();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro ao excluir");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Handshake className="h-7 w-7" />
            Consórcios
          </h1>
          <p className="mt-1 text-sm text-slate-500">Gestão de cotas, contemplação e parcelas.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" />
          Novo consórcio
        </button>
      </header>

      {summary ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Quantidade", value: String(summary.quantidade) },
            { label: "Crédito total", value: formatBRL(summary.creditoTotal) },
            { label: "Valor pago", value: formatBRL(summary.valorPago) },
            { label: "Saldo restante", value: formatBRL(summary.saldoRestante) },
            { label: "Contemplados", value: String(summary.contemplados) },
          ].map((card) => (
            <article key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{card.value}</p>
            </article>
          ))}
        </section>
      ) : null}

      <section className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value as ConsortiumType | "ALL")}
          className={cn(inputClassName, "w-auto min-w-[140px]")}
        >
          <option value="ALL">Todos os tipos</option>
          {TYPES.map((value) => (
            <option key={value} value={value}>
              {CONSORTIUM_TYPE_LABELS[value]}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ConsortiumStatus | "ALL")}
          className={cn(inputClassName, "w-auto min-w-[160px]")}
        >
          <option value="ALL">Todos os status</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {CONSORTIUM_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Mostrar inativos
        </label>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Crédito</th>
                <th className="px-4 py-3">Pago</th>
                <th className="px-4 py-3">Parcelas</th>
                <th className="px-4 py-3">Contemplação</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{item.nome}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium">
                      {CONSORTIUM_TYPE_LABELS[item.tipo]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_BADGE[item.status])}>
                      {CONSORTIUM_STATUS_LABELS[item.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">{formatBRL(item.valorCredito)}</td>
                  <td className="px-4 py-3">{formatBRL(item.valorPago)}</td>
                  <td className="px-4 py-3">
                    {item.parcelasPagas}/{item.quantidadeParcelas}
                  </td>
                  <td className="px-4 py-3">{item.dataContemplacao ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {item.estaAtivo && item.parcelasPagas < item.quantidadeParcelas ? (
                        <button
                          type="button"
                          onClick={() => void registerParcel(item)}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Pagar parcela
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(item)}
                        className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">Nenhum consórcio encontrado.</p>
        ) : null}
      </section>

      <InstrumentFormModal
        open={formOpen}
        title={editing ? "Editar consórcio" : "Novo consórcio"}
        submitting={submitting}
        onClose={() => setFormOpen(false)}
        onSubmit={() => void submitForm()}
      >
        <FormField label="Nome">
          <input className={inputClassName} value={nome} onChange={(e) => setNome(e.target.value)} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Tipo">
            <select className={inputClassName} value={tipo} onChange={(e) => setTipo(e.target.value as ConsortiumType)}>
              {TYPES.map((value) => (
                <option key={value} value={value}>
                  {CONSORTIUM_TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Status">
            <select
              className={inputClassName}
              value={status}
              onChange={(e) => setStatus(e.target.value as ConsortiumStatus)}
            >
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {CONSORTIUM_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Valor do crédito">
            <input className={inputClassName} type="number" step="0.01" value={valorCredito} onChange={(e) => setValorCredito(e.target.value)} />
          </FormField>
          <FormField label="Valor do lance">
            <input className={inputClassName} type="number" step="0.01" value={valorLance} onChange={(e) => setValorLance(e.target.value)} />
          </FormField>
          <FormField label="Valor pago">
            <input className={inputClassName} type="number" step="0.01" value={valorPago} onChange={(e) => setValorPago(e.target.value)} />
          </FormField>
          <FormField label="Taxas">
            <input className={inputClassName} type="number" step="0.01" value={valorTaxas} onChange={(e) => setValorTaxas(e.target.value)} />
          </FormField>
          <FormField label="Qtd. parcelas">
            <input className={inputClassName} type="number" value={quantidadeParcelas} onChange={(e) => setQuantidadeParcelas(e.target.value)} />
          </FormField>
          <FormField label="Parcelas pagas">
            <input className={inputClassName} type="number" value={parcelasPagas} onChange={(e) => setParcelasPagas(e.target.value)} />
          </FormField>
        </div>
        {status === "ASSET_ACQUIRED" ? (
          <FormField label="Bem patrimonial vinculado">
            <select className={inputClassName} value={assetId} onChange={(e) => setAssetId(e.target.value)}>
              <option value="">Selecione um ativo</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.nome}
                </option>
              ))}
            </select>
          </FormField>
        ) : null}
        <FormField label="Lançamento recorrente (opcional)">
          <select
            className={inputClassName}
            value={lancamentoRecorrenteId}
            onChange={(e) => setLancamentoRecorrenteId(e.target.value)}
          >
            <option value="">Nenhum</option>
            {recurring.map((row) => (
              <option key={row.id} value={row.id}>
                {row.descricao}
              </option>
            ))}
          </select>
        </FormField>
      </InstrumentFormModal>

      <SettingsConfirmDialog
        open={Boolean(confirmDelete)}
        title="Desativar consórcio"
        description={`Deseja desativar "${confirmDelete?.nome}"? O vínculo com o bem será removido.`}
        confirmLabel="Desativar"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => void confirmDeleteItem()}
      />
    </div>
  );
}

export function ConsortiumDashboard() {
  return (
    <SettingsToastProvider>
      <ConsortiumDashboardInner />
    </SettingsToastProvider>
  );
}
