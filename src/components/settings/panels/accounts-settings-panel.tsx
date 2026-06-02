"use client";

import { useMemo, useState } from "react";
import type { ConfigConta } from "@/types/instruments-config";
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_OPTIONS } from "@/types/instruments-config";
import {
  FormField,
  InstrumentFormModal,
  inputClassName,
} from "@/components/instruments/instrument-form-modal";
import { SettingsConfirmDialog } from "../settings-confirm-dialog";
import { SettingsRowActions } from "../settings-row-actions";
import { SettingsStatusBadge } from "../settings-status-badge";
import { SettingsToolbar } from "../settings-toolbar";
import { SettingsTableSkeleton } from "../settings-shared";
import { useSettingsToast } from "../settings-toast";
import {
  deleteInstrumentConfig,
  patchInstrumentConfig,
  postInstrumentConfig,
} from "@/lib/instruments/instrument-api";
import { cn } from "@/lib/utils/cn";
import { Plus } from "lucide-react";

interface AccountsSettingsPanelProps {
  items: ConfigConta[];
  loading: boolean;
  showInactive: boolean;
  onShowInactiveChange: (value: boolean) => void;
  onRefresh: () => Promise<void>;
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
}

export function AccountsSettingsPanel({
  items,
  loading,
  showInactive,
  onShowInactiveChange,
  onRefresh,
}: AccountsSettingsPanelProps) {
  const { pushToast } = useSettingsToast();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ConfigConta | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ConfigConta | null>(null);

  const [nome, setNome] = useState("");
  const [nomeInstituicao, setNomeInstituicao] = useState("");
  const [tipo, setTipo] = useState<(typeof ACCOUNT_TYPE_OPTIONS)[number]>("CORRENTE");
  const [moeda, setMoeda] = useState("BRL");
  const [saldo, setSaldo] = useState("0");

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter(
      (item) =>
        item.nome.toLowerCase().includes(term) ||
        (item.nomeInstituicao ?? "").toLowerCase().includes(term),
    );
  }, [items, search]);

  function openCreate() {
    setEditing(null);
    setNome("");
    setNomeInstituicao("");
    setTipo("CORRENTE");
    setMoeda("BRL");
    setSaldo("0");
    setFormOpen(true);
  }

  function openEdit(item: ConfigConta) {
    setEditing(item);
    setNome(item.nome);
    setNomeInstituicao(item.nomeInstituicao ?? "");
    setTipo(item.tipo ?? "CORRENTE");
    setMoeda(item.moeda);
    setSaldo(String(item.saldo));
    setFormOpen(true);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const payload = {
        nome,
        nomeInstituicao: nomeInstituicao || undefined,
        tipo,
        moeda,
        ...(editing ? { saldo: Number(saldo) } : { saldoInicial: Number(saldo) }),
      };

      if (editing) {
        await patchInstrumentConfig(`/api/config/contas/${editing.id}`, payload);
        pushToast("success", "Conta atualizada com sucesso.");
      } else {
        await postInstrumentConfig("/api/config/contas", payload);
        pushToast("success", "Conta criada com sucesso.");
      }

      setFormOpen(false);
      await onRefresh();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro ao salvar conta.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(item: ConfigConta, active: boolean) {
    setActionLoadingId(item.id);
    try {
      await patchInstrumentConfig(`/api/config/contas/${item.id}`, { estaAtiva: active });
      pushToast("success", active ? "Conta reativada." : "Conta desativada.");
      await onRefresh();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro ao atualizar status.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }

    setSubmitting(true);
    setActionLoadingId(pendingDelete.id);
    try {
      const result = await deleteInstrumentConfig(`/api/config/contas/${pendingDelete.id}`);
      pushToast(
        "success",
        result.mode === "soft"
          ? "Conta desativada (possui histórico vinculado)."
          : "Conta excluída permanentemente.",
      );
      setConfirmOpen(false);
      setPendingDelete(null);
      await onRefresh();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro ao excluir conta.");
    } finally {
      setSubmitting(false);
      setActionLoadingId(null);
    }
  }

  return (
    <section className="space-y-4">
      <SettingsToolbar
        search={search}
        onSearchChange={setSearch}
        showInactive={showInactive}
        onShowInactiveChange={onShowInactiveChange}
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Nova Conta
          </button>
        }
      />

      {loading ? (
        <SettingsTableSkeleton />
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Nenhuma conta encontrada.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Instituição</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Saldo</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <tr key={item.id} className={cn(!item.estaAtiva && "bg-slate-50 opacity-75")}>
                  <td className="px-4 py-3 font-medium text-slate-900">{item.nome}</td>
                  <td className="px-4 py-3 text-slate-600">{item.nomeInstituicao ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {item.tipo ? ACCOUNT_TYPE_LABELS[item.tipo] : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-900">
                    {formatCurrency(item.saldo, item.moeda)}
                  </td>
                  <td className="px-4 py-3">
                    <SettingsStatusBadge active={item.estaAtiva !== false} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <SettingsRowActions
                      active={item.estaAtiva !== false}
                      loading={actionLoadingId === item.id}
                      onEdit={() => openEdit(item)}
                      onToggleActive={() =>
                        void handleToggleActive(item, item.estaAtiva === false)
                      }
                      onDelete={() => {
                        setPendingDelete(item);
                        setConfirmOpen(true);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <InstrumentFormModal
        open={formOpen}
        title={editing ? "Editar conta financeira" : "Nova conta financeira"}
        onClose={() => setFormOpen(false)}
        onSubmit={() => void handleSubmit()}
        submitting={submitting}
      >
        <FormField label="Nome">
          <input className={inputClassName} value={nome} onChange={(e) => setNome(e.target.value)} required />
        </FormField>
        <FormField label="Instituição">
          <input
            className={inputClassName}
            value={nomeInstituicao}
            onChange={(e) => setNomeInstituicao(e.target.value)}
          />
        </FormField>
        <FormField label="Tipo">
          <select className={inputClassName} value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
            {ACCOUNT_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {ACCOUNT_TYPE_LABELS[option]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Moeda">
          <input className={inputClassName} value={moeda} onChange={(e) => setMoeda(e.target.value.toUpperCase())} maxLength={3} required />
        </FormField>
        <FormField label={editing ? "Saldo atual" : "Saldo inicial"}>
          <input
            className={inputClassName}
            type="number"
            step="0.01"
            value={saldo}
            onChange={(e) => setSaldo(e.target.value)}
            required
          />
        </FormField>
      </InstrumentFormModal>

      <SettingsConfirmDialog
        open={confirmOpen}
        title="Excluir conta financeira"
        description="Se houver transações, cartões ou recorrências vinculadas, a conta será apenas desativada."
        confirmLabel="Excluir"
        destructive
        loading={submitting}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingDelete(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  );
}
