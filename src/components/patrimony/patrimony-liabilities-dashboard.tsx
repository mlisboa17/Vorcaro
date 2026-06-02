"use client";

import {
  FormField,
  InstrumentFormModal,
  inputClassName,
} from "@/components/instruments/instrument-form-modal";
import { SettingsConfirmDialog } from "@/components/settings/settings-confirm-dialog";
import { SettingsRowActions } from "@/components/settings/settings-row-actions";
import { SettingsStatusBadge } from "@/components/settings/settings-status-badge";
import { SettingsToastProvider, useSettingsToast } from "@/components/settings/settings-toast";
import {
  formatBRL,
  LIABILITY_TYPE_LABELS,
  type PatrimonyLiabilityDto,
} from "@/types/patrimony";
import { Loader2, Plus, TrendingDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const LIABILITY_TYPES = ["FINANCING", "LOAN", "CREDIT_LINE", "OTHER"] as const;

function PatrimonyLiabilitiesDashboardInner() {
  const { pushToast } = useSettingsToast();
  const [loading, setLoading] = useState(true);
  const [liabilities, setLiabilities] = useState<PatrimonyLiabilityDto[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<PatrimonyLiabilityDto | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PatrimonyLiabilityDto | null>(null);

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<(typeof LIABILITY_TYPES)[number]>("FINANCING");
  const [saldoOriginal, setSaldoOriginal] = useState("");
  const [saldoAtual, setSaldoAtual] = useState("");
  const [taxaJuros, setTaxaJuros] = useState("");
  const [dataContratacao, setDataContratacao] = useState("");
  const [dataQuitacao, setDataQuitacao] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const query = showInactive ? "?includeInactive=true" : "";
      const response = await fetch(`/api/patrimony/liabilities${query}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Falha ao carregar passivos");
      }

      const payload = (await response.json()) as { items: PatrimonyLiabilityDto[] };
      setLiabilities(payload.items ?? []);
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro ao carregar passivos");
    } finally {
      setLoading(false);
    }
  }, [showInactive, pushToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeLiabilities = useMemo(
    () => liabilities.filter((item) => item.estaAtivo),
    [liabilities],
  );

  const stats = useMemo(() => {
    const items = activeLiabilities;
    return {
      quantidade: items.length,
      saldoDevedorTotal: items.reduce((sum, item) => sum + item.saldoAtual, 0),
      passivosTotais: items.reduce((sum, item) => sum + item.saldoOriginal, 0),
    };
  }, [activeLiabilities]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return liabilities.filter((item) => item.nome.toLowerCase().includes(term));
  }, [liabilities, search]);

  function openCreate() {
    setEditing(null);
    setNome("");
    setTipo("FINANCING");
    setSaldoOriginal("");
    setSaldoAtual("");
    setTaxaJuros("");
    setDataContratacao("");
    setDataQuitacao("");
    setFormOpen(true);
  }

  function openEdit(item: PatrimonyLiabilityDto) {
    setEditing(item);
    setNome(item.nome);
    setTipo(
      (LIABILITY_TYPES.includes(item.tipo as (typeof LIABILITY_TYPES)[number])
        ? item.tipo
        : "OTHER") as (typeof LIABILITY_TYPES)[number],
    );
    setSaldoOriginal(String(item.saldoOriginal));
    setSaldoAtual(String(item.saldoAtual));
    setTaxaJuros(item.taxaJuros !== null ? String(item.taxaJuros) : "");
    setDataContratacao(item.dataContratacao ?? "");
    setDataQuitacao(item.dataQuitacaoPrevista ?? "");
    setFormOpen(true);
  }

  async function saveLiability() {
    setSubmitting(true);
    try {
      const parsedOriginal = Number(saldoOriginal);
      const parsedAtual = saldoAtual ? Number(saldoAtual) : parsedOriginal;

      if (!nome.trim()) throw new Error("Informe o nome");
      if (!Number.isFinite(parsedOriginal) || parsedOriginal <= 0) {
        throw new Error("Informe o saldo original");
      }
      if (!Number.isFinite(parsedAtual) || parsedAtual < 0) {
        throw new Error("Informe o saldo atual");
      }

      const body: Record<string, unknown> = {
        nome: nome.trim(),
        tipo,
        saldoOriginal: parsedOriginal,
        saldoAtual: parsedAtual,
      };

      if (taxaJuros) body.taxaJuros = Number(taxaJuros);
      if (dataContratacao) body.dataContratacao = dataContratacao;
      if (dataQuitacao) body.dataQuitacaoPrevista = dataQuitacao;

      const url = editing
        ? `/api/patrimony/liabilities/${editing.id}`
        : "/api/patrimony/liabilities";
      const method = editing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Falha ao salvar passivo");
      }

      pushToast("success", editing ? "Passivo atualizado." : "Passivo criado.");
      setFormOpen(false);
      await loadData();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro ao salvar");
    } finally {
      setSubmitting(false);
    }
  }

  async function deactivate(item: PatrimonyLiabilityDto) {
    try {
      const response = await fetch(`/api/patrimony/liabilities/${item.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Falha ao desativar passivo");
      }

      pushToast("success", "Passivo desativado.");
      await loadData();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro ao desativar");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Patrimônio</h1>
        <p className="mt-1 text-sm text-slate-600">
          Financiamentos, empréstimos e dívidas — saldo devedor e vínculo com recorrências.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <TrendingDown className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium">Passivos Totais</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatBRL(stats.passivosTotais)}</p>
          <p className="text-xs text-slate-500">Soma dos saldos originais (ativos)</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-700">Quantidade de Passivos</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.quantidade}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-700">Saldo Devedor Total</p>
          <p className="mt-2 text-2xl font-bold text-red-700">{formatBRL(stats.saldoDevedorTotal)}</p>
        </article>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <span className="border-b-2 border-emerald-600 px-2 pb-2 text-sm font-semibold text-slate-900">
            Passivos
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar passivo..."
            className="max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-slate-300"
              />
              Mostrar inativos
            </label>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              Novo Passivo
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Saldo Original</th>
                <th className="px-4 py-3">Saldo Atual</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Nenhum passivo cadastrado.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className={!item.estaAtivo ? "opacity-60" : undefined}>
                    <td className="px-4 py-3 font-medium">{item.nome}</td>
                    <td className="px-4 py-3">
                      {LIABILITY_TYPE_LABELS[item.tipo] ?? item.tipo}
                    </td>
                    <td className="px-4 py-3">{formatBRL(item.saldoOriginal)}</td>
                    <td className="px-4 py-3 text-red-700">{formatBRL(item.saldoAtual)}</td>
                    <td className="px-4 py-3">
                      <SettingsStatusBadge active={item.estaAtivo} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <SettingsRowActions
                        active={item.estaAtivo}
                        onEdit={() => openEdit(item)}
                        onToggleActive={() => void deactivate(item)}
                        onDelete={() => setConfirmDelete(item)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <InstrumentFormModal
        open={formOpen}
        title={editing ? "Editar passivo" : "Novo passivo"}
        onClose={() => setFormOpen(false)}
        onSubmit={() => void saveLiability()}
        submitting={submitting}
      >
        <FormField label="Nome">
          <input className={inputClassName} value={nome} onChange={(e) => setNome(e.target.value)} />
        </FormField>
        <FormField label="Tipo">
          <select className={inputClassName} value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
            {LIABILITY_TYPES.map((value) => (
              <option key={value} value={value}>
                {LIABILITY_TYPE_LABELS[value] ?? value}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Saldo original">
          <input
            className={inputClassName}
            type="number"
            min="0"
            step="0.01"
            value={saldoOriginal}
            onChange={(e) => setSaldoOriginal(e.target.value)}
          />
        </FormField>
        <FormField label="Saldo atual">
          <input
            className={inputClassName}
            type="number"
            min="0"
            step="0.01"
            value={saldoAtual}
            onChange={(e) => setSaldoAtual(e.target.value)}
            placeholder="Igual ao original se vazio"
          />
        </FormField>
        <FormField label="Taxa de juros (% a.a.) — opcional">
          <input
            className={inputClassName}
            type="number"
            min="0"
            step="0.01"
            value={taxaJuros}
            onChange={(e) => setTaxaJuros(e.target.value)}
          />
        </FormField>
        <FormField label="Data de contratação — opcional">
          <input
            className={inputClassName}
            type="date"
            value={dataContratacao}
            onChange={(e) => setDataContratacao(e.target.value)}
          />
        </FormField>
        <FormField label="Quitação prevista — opcional">
          <input
            className={inputClassName}
            type="date"
            value={dataQuitacao}
            onChange={(e) => setDataQuitacao(e.target.value)}
          />
        </FormField>
      </InstrumentFormModal>

      <SettingsConfirmDialog
        open={confirmDelete !== null}
        title="Desativar passivo?"
        description="O passivo será marcado como inativo e permanecerá no histórico."
        confirmLabel="Desativar"
        onConfirm={() => {
          if (confirmDelete) void deactivate(confirmDelete);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

export function PatrimonyLiabilitiesDashboard() {
  return (
    <SettingsToastProvider>
      <PatrimonyLiabilitiesDashboardInner />
    </SettingsToastProvider>
  );
}
