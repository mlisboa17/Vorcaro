"use client";

import { useMemo, useState } from "react";
import type { ConfigCategoria } from "@/types/instruments-config";
import { CATEGORY_TYPE_LABELS } from "@/types/instruments-config";
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
import Link from "next/link";
import { Plus, ScanSearch } from "lucide-react";

interface CategoriesSettingsPanelProps {
  items: ConfigCategoria[];
  loading: boolean;
  showInactive: boolean;
  onShowInactiveChange: (value: boolean) => void;
  onRefresh: () => Promise<void>;
}

type FormMode = "create-root" | "create-sub" | "edit";

export function CategoriesSettingsPanel({
  items,
  loading,
  showInactive,
  onShowInactiveChange,
  onRefresh,
}: CategoriesSettingsPanelProps) {
  const { pushToast } = useSettingsToast();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create-root");
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ConfigCategoria | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ConfigCategoria | null>(null);

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"RECEITA" | "DESPESA">("DESPESA");
  const [categoriaPaiId, setCategoriaPaiId] = useState("");

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return items;
    }

    return items
      .map((root) => {
        const rootMatch = root.nome.toLowerCase().includes(term);
        const subs = (root.subcategorias ?? []).filter((sub) =>
          sub.nome.toLowerCase().includes(term),
        );

        if (rootMatch || subs.length > 0) {
          return { ...root, subcategorias: rootMatch ? root.subcategorias : subs };
        }

        return null;
      })
      .filter(Boolean) as ConfigCategoria[];
  }, [items, search]);

  function openCreateRoot() {
    setFormMode("create-root");
    setEditing(null);
    setNome("");
    setTipo("DESPESA");
    setCategoriaPaiId("");
    setFormOpen(true);
  }

  function openCreateSub() {
    setFormMode("create-sub");
    setEditing(null);
    setNome("");
    setTipo("DESPESA");
    setCategoriaPaiId(items[0]?.id ?? "");
    setFormOpen(true);
  }

  function openEdit(item: ConfigCategoria, parentType?: "RECEITA" | "DESPESA" | null) {
    setFormMode("edit");
    setEditing(item);
    setNome(item.nome);
    setTipo(item.tipo ?? parentType ?? "DESPESA");
    setCategoriaPaiId(item.categoriaPaiId ?? "");
    setFormOpen(true);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      if (formMode === "edit" && editing) {
        await patchInstrumentConfig(`/api/config/categorias/${editing.id}`, { nome });
        pushToast("success", "Categoria atualizada com sucesso.");
      } else {
        await postInstrumentConfig("/api/config/categorias", {
          nome,
          tipo,
          ...(formMode === "create-sub" ? { categoriaPaiId } : {}),
        });
        pushToast("success", "Categoria criada com sucesso.");
      }

      setFormOpen(false);
      await onRefresh();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro ao salvar categoria.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(item: ConfigCategoria, active: boolean) {
    setActionLoadingId(item.id);
    try {
      await patchInstrumentConfig(`/api/config/categorias/${item.id}`, { estaAtiva: active });
      pushToast("success", active ? "Categoria reativada." : "Categoria desativada.");
      await onRefresh();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro ao atualizar status.");
    } finally {
      setActionLoadingId(null);
    }
  }

  function requestDelete(item: ConfigCategoria) {
    setPendingDelete(item);
    setConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }

    setSubmitting(true);
    setActionLoadingId(pendingDelete.id);
    try {
      const result = await deleteInstrumentConfig(`/api/config/categorias/${pendingDelete.id}`);
      pushToast(
        "success",
        result.mode === "soft"
          ? "Categoria desativada (possui histórico vinculado)."
          : "Categoria excluída permanentemente.",
      );
      setConfirmOpen(false);
      setPendingDelete(null);
      await onRefresh();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro ao excluir categoria.");
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
          <>
            <button
              type="button"
              onClick={openCreateRoot}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Nova Categoria
            </button>
            <button
              type="button"
              onClick={openCreateSub}
              disabled={items.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Nova Subcategoria
            </button>
            <Link
              href="/dashboard/categories/audit"
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
            >
              <ScanSearch className="h-4 w-4" />
              Auditoria Vorcaro
            </Link>
          </>
        }
      />

      {loading ? (
        <SettingsTableSkeleton />
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Nenhuma categoria encontrada.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-100">
            {filteredItems.map((root) => (
              <li key={root.id}>
                <div
                  className={cn(
                    "flex items-center justify-between gap-4 px-4 py-3",
                    !root.estaAtiva && "bg-slate-50 opacity-75",
                  )}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900">{root.nome}</span>
                      <span className="text-xs text-slate-500">
                        {root.tipo ? CATEGORY_TYPE_LABELS[root.tipo] : ""}
                      </span>
                      <SettingsStatusBadge active={root.estaAtiva !== false} />
                    </div>
                  </div>
                  <SettingsRowActions
                    active={root.estaAtiva !== false}
                    loading={actionLoadingId === root.id}
                    onEdit={() => openEdit(root)}
                    onToggleActive={() =>
                      void handleToggleActive(root, root.estaAtiva === false)
                    }
                    onDelete={() => requestDelete(root)}
                  />
                </div>

                {(root.subcategorias ?? []).map((sub) => (
                  <div
                    key={sub.id}
                    className={cn(
                      "flex items-center justify-between gap-4 border-t border-slate-50 px-4 py-2.5 pl-10",
                      !sub.estaAtiva && "bg-slate-50 opacity-75",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-slate-800">— {sub.nome}</span>
                      <SettingsStatusBadge active={sub.estaAtiva !== false} />
                    </div>
                    <SettingsRowActions
                      active={sub.estaAtiva !== false}
                      loading={actionLoadingId === sub.id}
                      onEdit={() => openEdit({ ...sub, categoriaPaiId: root.id }, root.tipo)}
                      onToggleActive={() =>
                        void handleToggleActive(sub, sub.estaAtiva === false)
                      }
                      onDelete={() => requestDelete(sub)}
                    />
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </div>
      )}

      <InstrumentFormModal
        open={formOpen}
        title={
          formMode === "edit"
            ? "Editar categoria"
            : formMode === "create-sub"
              ? "Nova subcategoria"
              : "Nova categoria"
        }
        onClose={() => setFormOpen(false)}
        onSubmit={() => void handleSubmit()}
        submitting={submitting}
        submitLabel={formMode === "edit" ? "Salvar" : "Criar"}
      >
        <FormField label="Nome">
          <input
            className={inputClassName}
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            required
          />
        </FormField>

        {formMode !== "edit" ? (
          <FormField label="Tipo">
            <select
              className={inputClassName}
              value={tipo}
              onChange={(event) => setTipo(event.target.value as "RECEITA" | "DESPESA")}
            >
              <option value="DESPESA">Despesa</option>
              <option value="RECEITA">Receita</option>
            </select>
          </FormField>
        ) : null}

        {formMode === "create-sub" ? (
          <FormField label="Categoria principal">
            <select
              className={inputClassName}
              value={categoriaPaiId}
              onChange={(event) => setCategoriaPaiId(event.target.value)}
              required
            >
              {items.map((root) => (
                <option key={root.id} value={root.id}>
                  {root.nome}
                </option>
              ))}
            </select>
          </FormField>
        ) : null}
      </InstrumentFormModal>

      <SettingsConfirmDialog
        open={confirmOpen}
        title="Excluir categoria"
        description="Se houver transações ou recorrências vinculadas, a categoria será apenas desativada. Caso contrário, será removida permanentemente."
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
