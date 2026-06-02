"use client";

import { useMemo, useState } from "react";
import type { ConfigCartao, ConfigConta } from "@/types/instruments-config";
import {
  CARD_BRAND_OPTIONS,
  CARD_TYPE_LABELS,
  CARD_TYPE_OPTIONS,
} from "@/types/instruments-config";
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

interface CardsSettingsPanelProps {
  items: ConfigCartao[];
  contas: ConfigConta[];
  loading: boolean;
  showInactive: boolean;
  onShowInactiveChange: (value: boolean) => void;
  onRefresh: () => Promise<void>;
}

export function CardsSettingsPanel({
  items,
  contas,
  loading,
  showInactive,
  onShowInactiveChange,
  onRefresh,
}: CardsSettingsPanelProps) {
  const { pushToast } = useSettingsToast();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ConfigCartao | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ConfigCartao | null>(null);

  const [nome, setNome] = useState("");
  const [nomeInstituicao, setNomeInstituicao] = useState("");
  const [contaFinanceiraId, setContaFinanceiraId] = useState("");
  const [bandeira, setBandeira] = useState<(typeof CARD_BRAND_OPTIONS)[number]>("VISA");
  const [tipo, setTipo] = useState<(typeof CARD_TYPE_OPTIONS)[number]>("CREDITO");
  const [ultimosQuatroDigitos, setUltimosQuatroDigitos] = useState("");
  const [diaFechamento, setDiaFechamento] = useState("");
  const [diaVencimento, setDiaVencimento] = useState("");

  const contaLabels = useMemo(
    () => new Map(contas.map((conta) => [conta.id, conta.nome])),
    [contas],
  );

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter(
      (item) =>
        item.nome.toLowerCase().includes(term) ||
        (item.nomeInstituicao ?? "").toLowerCase().includes(term) ||
        (item.ultimosQuatroDigitos ?? "").includes(term),
    );
  }, [items, search]);

  function openCreate() {
    setEditing(null);
    setNome("");
    setNomeInstituicao("");
    setContaFinanceiraId(contas[0]?.id ?? "");
    setBandeira("VISA");
    setTipo("CREDITO");
    setUltimosQuatroDigitos("");
    setDiaFechamento("");
    setDiaVencimento("");
    setFormOpen(true);
  }

  function openEdit(item: ConfigCartao) {
    setEditing(item);
    setNome(item.nome);
    setNomeInstituicao(item.nomeInstituicao ?? "");
    setContaFinanceiraId(item.contaFinanceiraId ?? "");
    setBandeira(item.bandeira);
    setTipo(item.tipo);
    setUltimosQuatroDigitos(item.ultimosQuatroDigitos ?? "");
    setDiaFechamento(item.diaFechamento ? String(item.diaFechamento) : "");
    setDiaVencimento(item.diaVencimento ? String(item.diaVencimento) : "");
    setFormOpen(true);
  }

  function buildPayload() {
    return {
      nome,
      nomeInstituicao: nomeInstituicao || undefined,
      contaFinanceiraId: contaFinanceiraId || undefined,
      bandeira,
      tipo,
      ultimosQuatroDigitos: ultimosQuatroDigitos || undefined,
      diaFechamento: diaFechamento ? Number(diaFechamento) : undefined,
      diaVencimento: diaVencimento ? Number(diaVencimento) : undefined,
    };
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      if (editing) {
        await patchInstrumentConfig(`/api/config/cartoes/${editing.id}`, buildPayload());
        pushToast("success", "Cartão atualizado com sucesso.");
      } else {
        await postInstrumentConfig("/api/config/cartoes", buildPayload());
        pushToast("success", "Cartão criado com sucesso.");
      }

      setFormOpen(false);
      await onRefresh();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro ao salvar cartão.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(item: ConfigCartao, active: boolean) {
    setActionLoadingId(item.id);
    try {
      await patchInstrumentConfig(`/api/config/cartoes/${item.id}`, { estaAtivo: active });
      pushToast("success", active ? "Cartão reativado." : "Cartão desativado.");
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
      const result = await deleteInstrumentConfig(`/api/config/cartoes/${pendingDelete.id}`);
      pushToast(
        "success",
        result.mode === "soft"
          ? "Cartão desativado (possui histórico vinculado)."
          : "Cartão excluído permanentemente.",
      );
      setConfirmOpen(false);
      setPendingDelete(null);
      await onRefresh();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro ao excluir cartão.");
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
            Novo Cartão
          </button>
        }
      />

      {loading ? (
        <SettingsTableSkeleton />
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Nenhum cartão encontrado.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Instituição</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Final</th>
                <th className="px-4 py-3">Conta</th>
                <th className="px-4 py-3">Fech./Venc.</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <tr key={item.id} className={cn(!item.estaAtivo && "bg-slate-50 opacity-75")}>
                  <td className="px-4 py-3 font-medium text-slate-900">{item.nome}</td>
                  <td className="px-4 py-3 text-slate-600">{item.nomeInstituicao ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{CARD_TYPE_LABELS[item.tipo]}</td>
                  <td className="px-4 py-3 text-slate-600">{item.ultimosQuatroDigitos ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {item.contaFinanceiraId
                      ? (contaLabels.get(item.contaFinanceiraId) ?? "—")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {item.diaFechamento ?? "—"} / {item.diaVencimento ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <SettingsStatusBadge active={item.estaAtivo !== false} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <SettingsRowActions
                      active={item.estaAtivo !== false}
                      loading={actionLoadingId === item.id}
                      onEdit={() => openEdit(item)}
                      onToggleActive={() =>
                        void handleToggleActive(item, item.estaAtivo === false)
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
        title={editing ? "Editar cartão" : "Novo cartão"}
        onClose={() => setFormOpen(false)}
        onSubmit={() => void handleSubmit()}
        submitting={submitting}
      >
        <FormField label="Nome">
          <input className={inputClassName} value={nome} onChange={(e) => setNome(e.target.value)} required />
        </FormField>
        <FormField label="Instituição">
          <input className={inputClassName} value={nomeInstituicao} onChange={(e) => setNomeInstituicao(e.target.value)} />
        </FormField>
        <FormField label="Conta vinculada">
          <select
            className={inputClassName}
            value={contaFinanceiraId}
            onChange={(e) => setContaFinanceiraId(e.target.value)}
          >
            <option value="">Nenhuma</option>
            {contas.map((conta) => (
              <option key={conta.id} value={conta.id}>
                {conta.nome}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Bandeira">
          <select className={inputClassName} value={bandeira} onChange={(e) => setBandeira(e.target.value as typeof bandeira)}>
            {CARD_BRAND_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Tipo">
          <select className={inputClassName} value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
            {CARD_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {CARD_TYPE_LABELS[option]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Últimos 4 dígitos">
          <input
            className={inputClassName}
            value={ultimosQuatroDigitos}
            onChange={(e) => setUltimosQuatroDigitos(e.target.value.replace(/\D/g, "").slice(0, 4))}
            maxLength={4}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Dia fechamento">
            <input
              className={inputClassName}
              type="number"
              min={1}
              max={31}
              value={diaFechamento}
              onChange={(e) => setDiaFechamento(e.target.value)}
            />
          </FormField>
          <FormField label="Dia vencimento">
            <input
              className={inputClassName}
              type="number"
              min={1}
              max={31}
              value={diaVencimento}
              onChange={(e) => setDiaVencimento(e.target.value)}
            />
          </FormField>
        </div>
      </InstrumentFormModal>

      <SettingsConfirmDialog
        open={confirmOpen}
        title="Excluir cartão"
        description="Se houver transações ou recorrências vinculadas, o cartão será apenas desativado."
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
