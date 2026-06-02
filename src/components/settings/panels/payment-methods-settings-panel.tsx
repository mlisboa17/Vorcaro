"use client";

import { useMemo, useState } from "react";
import type { ConfigFormaPagamento } from "@/types/instruments-config";
import { PAYMENT_TYPE_LABELS, PAYMENT_TYPE_OPTIONS } from "@/types/instruments-config";
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

interface PaymentMethodsSettingsPanelProps {
  items: ConfigFormaPagamento[];
  loading: boolean;
  showInactive: boolean;
  onShowInactiveChange: (value: boolean) => void;
  onRefresh: () => Promise<void>;
}

export function PaymentMethodsSettingsPanel({
  items,
  loading,
  showInactive,
  onShowInactiveChange,
  onRefresh,
}: PaymentMethodsSettingsPanelProps) {
  const { pushToast } = useSettingsToast();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ConfigFormaPagamento | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ConfigFormaPagamento | null>(null);

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<(typeof PAYMENT_TYPE_OPTIONS)[number]>("PIX");
  const [padrao, setPadrao] = useState(false);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => item.nome.toLowerCase().includes(term));
  }, [items, search]);

  function openCreate() {
    setEditing(null);
    setNome("");
    setTipo("PIX");
    setPadrao(false);
    setFormOpen(true);
  }

  function openEdit(item: ConfigFormaPagamento) {
    setEditing(item);
    setNome(item.nome);
    setTipo(item.tipo ?? "PIX");
    setPadrao(item.padrao);
    setFormOpen(true);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const payload = { nome, tipo, padrao };

      if (editing) {
        await patchInstrumentConfig(`/api/config/formas-pagamento/${editing.id}`, payload);
        pushToast("success", "Forma de pagamento atualizada com sucesso.");
      } else {
        await postInstrumentConfig("/api/config/formas-pagamento", payload);
        pushToast("success", "Forma de pagamento criada com sucesso.");
      }

      setFormOpen(false);
      await onRefresh();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro ao salvar forma de pagamento.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(item: ConfigFormaPagamento, active: boolean) {
    setActionLoadingId(item.id);
    try {
      await patchInstrumentConfig(`/api/config/formas-pagamento/${item.id}`, { estaAtiva: active });
      pushToast("success", active ? "Forma reativada." : "Forma desativada.");
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
      const result = await deleteInstrumentConfig(
        `/api/config/formas-pagamento/${pendingDelete.id}`,
      );
      pushToast(
        "success",
        result.mode === "soft"
          ? "Forma desativada (possui histórico vinculado)."
          : "Forma excluída permanentemente.",
      );
      setConfirmOpen(false);
      setPendingDelete(null);
      await onRefresh();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro ao excluir forma de pagamento.");
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
            Nova Forma
          </button>
        }
      />

      {loading ? (
        <SettingsTableSkeleton />
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Nenhuma forma de pagamento encontrada.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Padrão</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <tr key={item.id} className={cn(!item.estaAtiva && "bg-slate-50 opacity-75")}>
                  <td className="px-4 py-3 font-medium text-slate-900">{item.nome}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {item.tipo ? PAYMENT_TYPE_LABELS[item.tipo] : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.padrao ? "Sim" : "Não"}</td>
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
        title={editing ? "Editar forma de pagamento" : "Nova forma de pagamento"}
        onClose={() => setFormOpen(false)}
        onSubmit={() => void handleSubmit()}
        submitting={submitting}
      >
        <FormField label="Nome">
          <input className={inputClassName} value={nome} onChange={(e) => setNome(e.target.value)} required />
        </FormField>
        <FormField label="Tipo">
          <select className={inputClassName} value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
            {PAYMENT_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {PAYMENT_TYPE_LABELS[option]}
              </option>
            ))}
          </select>
        </FormField>
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={padrao}
            onChange={(e) => setPadrao(e.target.checked)}
            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
          />
          Definir como padrão
        </label>
      </InstrumentFormModal>

      <SettingsConfirmDialog
        open={confirmOpen}
        title="Excluir forma de pagamento"
        description="Se houver transações ou recorrências vinculadas, a forma será apenas desativada."
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
