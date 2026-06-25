"use client";

import React, { useState, useTransition, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  FileUp, Loader2, ArrowUpRight, ArrowDownLeft, Check, X, AlertCircle, HelpCircle, ChevronDown, ChevronRight, Sparkles, Plus, Link2
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { approveStatementLine } from "@/modules/statements/actions/approve-statement-line";
import { rejectStatementLine } from "@/modules/statements/actions/reject-statement-line";
import { processStatementBatch } from "@/modules/statements/actions/process-statement-batch";
import { registerDetectedAccount } from "@/modules/statements/actions/register-detected-account";
import { ignoreDetectedAccount } from "@/modules/statements/actions/ignore-detected-account";
import { bulkApproveStatementLines } from "@/modules/statements/actions/bulk-approve-statement-lines";
import { createInlineCategory } from "@/modules/categories/actions/create-inline-category";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  getSortedRowModel,
  SortingState,
  RowSelectionState
} from "@tanstack/react-table";

export interface StagingSuggestion {
  id: string;
  description: string;
  amount: number;
  date: Date;
  cnpjCpf: string | null;
  suggestedName: string | null;
  originId: string | null;
  destinationId: string | null;
  score: number;
  status: string;
  reconciliationMatchId: string | null;
}

export interface BankImportHistoryItem {
  id: string;
  fileName: string;
  status: string;
  transactionsCount: number;
  createdAt: Date;
  account: {
    name: string;
  };
}

export interface CategoryOption {
  id: string;
  name: string;
}

export interface AccountOption {
  id: string;
  name: string;
}

interface UnifiedReconciliationProps {
  initialLines: StagingSuggestion[];
  categories: CategoryOption[];
  accounts: AccountOption[];
  history: BankImportHistoryItem[];
}

function CategoryCombobox({
  categories,
  selectedId,
  onChange,
  onCreateCategory,
  disabled,
}: {
  categories: CategoryOption[];
  selectedId: string;
  onChange: (id: string) => void;
  onCreateCategory: (name: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedCategory = categories.find((c) => c.id === selectedId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const hasExactMatch = categories.some(
    (c) => c.name.toLowerCase() === search.trim().toLowerCase()
  );

  return (
    <div ref={containerRef} className="relative w-44 text-xs">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-slate-800 shadow-sm transition-all hover:bg-slate-50 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
      >
        <span className="truncate">{selectedCategory ? selectedCategory.name : "Selecione..."}</span>
        <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-56 w-56 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150 dark:border-slate-800 dark:bg-slate-950">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ou criar..."
            className="w-full rounded border border-slate-200 px-2 py-1 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
          <div className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  onChange(cat.id);
                  setIsOpen(false);
                  setSearch("");
                }}
                className="flex w-full items-center justify-between px-2 py-1.5 text-left rounded-md hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              >
                <span className="truncate">{cat.name}</span>
                {selectedId === cat.id && <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />}
              </button>
            ))}

            {search.trim() && !hasExactMatch && (
              <button
                type="button"
                onClick={async () => {
                  await onCreateCategory(search.trim());
                  setIsOpen(false);
                  setSearch("");
                }}
                className="flex w-full items-center gap-1.5 px-2 py-2 text-left rounded-md text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/20 transition-colors font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Criar "{search.trim()}"</span>
              </button>
            )}

            {filtered.length === 0 && !search.trim() && (
              <div className="px-2 py-4 text-center text-slate-400">Nenhuma categoria</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function UnifiedReconciliation({
  initialLines,
  categories,
  accounts,
  history,
}: UnifiedReconciliationProps) {
  const router = useRouter();
  const [lines, setLines] = useState<StagingSuggestion[]>(initialLines);
  const [localCategories, setLocalCategories] = useState<CategoryOption[]>(categories);
  const [rowCategories, setRowCategories] = useState<Record<string, string>>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Bulk parameters
  const [bulkCategoryId, setBulkCategoryId] = useState<string>("");
  const [bulkDate, setBulkDate] = useState<string>("");
  const [bulkDataCaixa, setBulkDataCaixa] = useState<string>("");

  // Form values for Dropzone and Math Consistency
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  // Mathematical Consistency Card inputs
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [finalBalance, setFinalBalance] = useState<number>(0);

  // States
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  // Sincroniza o estado local com as atualizações do servidor (Next.js Server Components / router.refresh)
  useEffect(() => {
    setLines(initialLines);
  }, [initialLines]);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);
  
  // Dropzone State
  const [dragActive, setDragActive] = useState(false);

  // Sentinel detection
  const pendingAccountSentinel = lines.find((line) => line.score === -99);
  const transactionLines = useMemo(() => lines.filter((line) => line.score !== -99), [lines]);
  const isFrozen = !!pendingAccountSentinel;

  // Upload processing
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("contaFinanceiraId", selectedAccountId);

    try {
      const result = await processStatementBatch(formData);
      if (result.success) {
        if (result.diagnostic) {
          setSuccessMsg(`Arquivo ${result.diagnostic.format} Processado: ${result.diagnostic.linesProcessed} transações identificadas.`);
        } else {
          setSuccessMsg(`Importação concluída! ${result.importedCount} lançamentos carregados.`);
        }
        window.location.href = "/dashboard/statements?tab=import-review";
      } else {
        setErrorMsg(result.error ?? "Erro ao processar arquivo.");
      }
    } catch (error) {
      setErrorMsg("Erro de conexão ao enviar o arquivo.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleApprove = (id: string) => {
    if (isFrozen) return;
    setBusyId(id);
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const selectedCategory = rowCategories[id] || null;
      const result = await approveStatementLine(
        id,
        selectedCategory,
        selectedAccountId || null
      );

      if (result.success) {
        setRowSelection({});
        router.refresh();
        setSuccessMsg("Transação conciliada e registrada com sucesso!");
        setLines((prev) => prev.filter((line) => line.id !== id));
      } else {
        setErrorMsg(result.error ?? "Erro ao conciliar transação.");
      }
      setBusyId(null);
    });
  };

  const handleReject = (id: string) => {
    if (isFrozen) return;
    setBusyId(id);
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const result = await rejectStatementLine(id);
      if (result.success) {
        setRowSelection({});
        router.refresh();
        setSuccessMsg("Linha descartada com sucesso.");
        setLines((prev) => prev.filter((line) => line.id !== id));
      } else {
        setErrorMsg(result.error ?? "Erro ao rejeitar linha.");
      }
      setBusyId(null);
    });
  };

  const handleBulkApprove = () => {
    const selectedIds = table.getSelectedRowModel().rows.map(r => r.original.id);
    if (selectedIds.length === 0 || isPending) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const idsToApprove = [...selectedIds];
    // Optimistic state update: instantly remove lines
    setLines((prev) => prev.filter((l) => !idsToApprove.includes(l.id)));
    setRowSelection({});

    startTransition(async () => {
      const result = await bulkApproveStatementLines({
        suggestionIds: idsToApprove,
        categoryId: bulkCategoryId || undefined,
        dateOverride: bulkDate || undefined,
        paymentMethodId: bulkDataCaixa || undefined
      });

      if (result.error) {
        setErrorMsg(result.error ?? "Erro ao aprovar lançamentos em lote.");
        // Rollback on failure
        const rollbackLines = initialLines.filter((l) => idsToApprove.includes(l.id));
        setLines((prev) =>
          [...prev, ...rollbackLines].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        );
        // Force selection state to reset in case rollback leaves dirty state
        setRowSelection({});
      } else {
        setRowSelection({});
        router.refresh();
        setSuccessMsg("Transações conciliadas em lote com sucesso!");
        // Clear bulk selectors
        setBulkCategoryId("");
        setBulkDate("");
        setBulkDataCaixa("");
      }
    });
  };

  const handleRegisterAccount = (sentinelId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    // Optimistic UI: remove the sentinel banner immediately to unfreeze the UI
    setLines((prev) => prev.filter((l) => l.id !== sentinelId));
    startTransition(async () => {
      const result = await registerDetectedAccount(sentinelId);
      if (result.success) {
        setSuccessMsg("Nova conta cadastrada com sucesso!");
        // We can reload or let Next.js background revalidation handle dropdown items.
        // If we want instant feel, we reload in background or don't block.
        window.location.reload();
      } else {
        setErrorMsg(result.error ?? "Erro ao cadastrar conta bancária.");
        // Rollback on failure
        const originalSentinel = initialLines.find((l) => l.id === sentinelId);
        if (originalSentinel) {
          setLines((prev) => [...prev, originalSentinel]);
        }
      }
    });
  };

  const handleIgnoreAccount = (sentinelId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    // Optimistic UI: remove the sentinel banner immediately to unfreeze the UI
    setLines((prev) => prev.filter((l) => l.id !== sentinelId));
    startTransition(async () => {
      const result = await ignoreDetectedAccount(sentinelId);
      if (result.success) {
        setSuccessMsg("Conta detectada ignorada.");
      } else {
        setErrorMsg(result.error ?? "Erro ao ignorar conta.");
        // Rollback on failure
        const originalSentinel = initialLines.find((l) => l.id === sentinelId);
        if (originalSentinel) {
          setLines((prev) => [...prev, originalSentinel]);
        }
      }
    });
  };

  // Calculation Math Consistency
  const netMovimentation = transactionLines.reduce((acc, line) => {
    const isIncome = line.originId !== null;
    return isIncome ? acc + line.amount : acc - Math.abs(line.amount);
  }, 0);

  const calculatedFinal = initialBalance + netMovimentation;
  const isConsistent = Math.abs(calculatedFinal - finalBalance) < 0.01;

  const getDetectedBankName = () => {
    if (!pendingAccountSentinel || !pendingAccountSentinel.suggestedName) return "Banco";
    const parts = pendingAccountSentinel.suggestedName.split(":");
    return parts[1] || "Banco";
  };

  const getBadgeStyles = (score: number) => {
    if (score >= 95) return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/30";
    if (score >= 85) return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/30";
    return "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-800/30";
  };

  const getStatusLabel = (score: number, status: string) => {
    if (score >= 95) return "CONFIRMADO";
    if (score >= 85) return "INFERIDO";
    return status || "DESCONHECIDO";
  };

  const columnHelper = createColumnHelper<StagingSuggestion>();

  const columns = useMemo(() => [
    columnHelper.display({
      id: "select",
      size: 35,
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
        />
      ),
    }),
    columnHelper.display({
      id: "fluxo",
      size: 35,
      header: "",
      cell: (info) => {
        const isIncome = info.row.original.originId !== null;
        return (
          <span className={cn(
            "inline-flex p-0.5 rounded border",
            isIncome
              ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/10 dark:text-emerald-400 dark:border-emerald-900/30"
              : "bg-red-50 text-red-600 border-red-100 dark:bg-red-950/10 dark:text-red-400 dark:border-red-900/30"
          )}>
            {isIncome ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
          </span>
        );
      }
    }),
    columnHelper.accessor("date", {
      header: "Data",
      size: 85,
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-400 font-medium font-mono text-[11px] leading-none">
          {new Date(info.getValue()).toLocaleDateString("pt-BR")}
        </span>
      ),
    }),
    columnHelper.display({
      id: "description",
      header: "Descrição Bruta / Sugerido",
      size: 200,
      cell: (info) => {
        const line = info.row.original;
        return (
          <div className="max-w-[190px] truncate leading-tight">
            <div className="flex items-center gap-1 leading-none">
              <span className="font-semibold text-slate-950 dark:text-slate-100 text-xs truncate" title={line.suggestedName || ""}>
                {line.suggestedName || "—"}
              </span>
              {line.reconciliationMatchId && (
                <span className="inline-flex items-center rounded bg-indigo-50 border border-indigo-200 text-indigo-700 px-1 py-0.2 text-[9px] font-bold tracking-wide shrink-0 leading-none">
                  LINK
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate leading-none" title={line.description}>
              {line.description}
            </div>
          </div>
        );
      }
    }),
    columnHelper.display({
      id: "categoria",
      header: "Categoria",
      size: 190,
      cell: (info) => {
        const line = info.row.original;
        return (
          <CategoryCombobox
            categories={localCategories}
            selectedId={rowCategories[line.id] || ""}
            onChange={(catId) => {
              setRowCategories((prev) => ({ ...prev, [line.id]: catId }));
            }}
            onCreateCategory={async (name) => {
              const res = await createInlineCategory({ name, type: "DESPESA" });
              if (res.categoryId) {
                const newCat = { id: res.categoryId, name };
                setLocalCategories((prev) => [...prev, newCat]);
                setRowCategories((prev) => ({ ...prev, [line.id]: res.categoryId! }));
              } else {
                setErrorMsg(res.error || "Erro ao criar categoria");
              }
            }}
            disabled={isFrozen}
          />
        );
      }
    }),
    columnHelper.accessor("cnpjCpf", {
      header: "CNPJ/CPF",
      size: 110,
      cell: (info) => {
        const value = info.getValue();
        return (
          <span className="text-slate-500 font-mono text-[10px] dark:text-slate-400 max-w-[100px] truncate block leading-none" title={value || ""}>
            {value || "—"}
          </span>
        );
      },
    }),
    columnHelper.accessor("amount", {
      header: "Valor",
      size: 100,
      cell: (info) => {
        const isIncome = info.row.original.originId !== null;
        return (
          <span className={cn(
            "font-semibold text-xs leading-none",
            isIncome ? "text-emerald-700 dark:text-emerald-400" : "text-slate-950 dark:text-slate-100"
          )}>
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
              Math.abs(info.getValue())
            )}
          </span>
        );
      }
    }),
    columnHelper.accessor("score", {
      header: "Confiança",
      size: 120,
      cell: (info) => {
        const score = info.getValue();
        const status = info.row.original.status;
        return (
          <span className={cn(
            "inline-flex items-center gap-0.5 rounded border px-1 py-0.2 text-[10px] font-semibold tracking-wider leading-none",
            getBadgeStyles(score)
          )}>
            {getStatusLabel(score, status)} ({score}%)
          </span>
        );
      }
    }),
    columnHelper.display({
      id: "actions",
      header: () => <div className="text-right">Ação</div>,
      size: 100,
      cell: (info) => {
        const line = info.row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            {line.reconciliationMatchId ? (
              <button
                type="button"
                onClick={() => handleApprove(line.id)}
                disabled={busyId === line.id || isPending || isFrozen}
                title="Conciliar Lançamento"
                className="inline-flex h-7 px-2 text-xs items-center justify-center rounded border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 shadow-sm transition-all focus:ring-2 focus:ring-indigo-500"
              >
                {busyId === line.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Link2 className="h-3.5 w-3.5" />
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleApprove(line.id)}
                disabled={busyId === line.id || isPending || isFrozen}
                title="Aprovar Lançamento"
                className="inline-flex h-7 px-2 text-xs items-center justify-center rounded border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 shadow-sm transition-all focus:ring-2 focus:ring-emerald-500"
              >
                {busyId === line.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => handleReject(line.id)}
              disabled={busyId === line.id || isPending || isFrozen}
              title="Rejeitar Lançamento"
              className="inline-flex h-7 px-2 text-xs items-center justify-center rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 shadow-sm transition-all focus:ring-2 focus:ring-red-500"
            >
              {busyId === line.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        );
      }
    }),
  ], [localCategories, rowCategories, isFrozen, busyId, isPending]);

  const table = useReactTable({
    data: transactionLines,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  });

  const selectedRows = table.getSelectedRowModel().rows;

  return (
    <div className="space-y-4 text-slate-800">
      {/* Toast/Notification Area */}
      {errorMsg && (
        <div className="flex items-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <Check className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* BANNER ATTENTION SAP FIORI HORIZON (Modo Sócio 1-Clique) */}
      {pendingAccountSentinel && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/10 dark:text-amber-300">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-amber-600 shrink-0 animate-pulse" />
            <div>
              <span className="font-bold block text-sm">Atenção (Modo Sócio):</span>
              <span className="text-xs">
                Nova Conta Bancária Detectada: <strong>{getDetectedBankName()}</strong>. Deseja vinculá-la ao seu perfil?
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleRegisterAccount(pendingAccountSentinel.id)}
              className="inline-flex items-center gap-1.5 rounded bg-amber-600 hover:bg-amber-700 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white shadow transition-all focus:ring-2 focus:ring-amber-500"
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              🔗 Cadastrar e Vincular
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleIgnoreAccount(pendingAccountSentinel.id)}
              className="inline-flex items-center gap-1.5 rounded border border-amber-200 bg-white hover:bg-amber-50 text-amber-800 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold transition-all focus:ring-2 focus:ring-amber-500"
            >
              <X className="h-3 w-3" />
              ❌ Ignorar
            </button>
          </div>
        </div>
      )}

      {/* Split top bar (Select destination Account + Dropzone area) */}
      <div className="grid gap-3 md:grid-cols-3">
        {/* Destination Account Selection */}
        <div className="flex flex-col justify-between rounded border border-slate-200 bg-slate-50 p-3 shadow-sm">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Conta de Destino
            </label>
            <p className="text-xs text-slate-400 mb-2">
              Selecione a conta bancária para a qual o extrato está sendo importado.
            </p>
            <select
              value={selectedAccountId}
              disabled={isFrozen}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-slate-500 disabled:opacity-50"
            >
              <option value="">Selecione uma conta...</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 text-[11px] text-slate-400">
            * Opcional. Se não selecionado, a conta será identificada a partir do arquivo.
          </div>
        </div>

        {/* AGNÓSTICO DROPZONE (OFX, PDF, CSV, XLSX) */}
        <div className="md:col-span-2">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={cn(
              "relative flex flex-col items-center justify-center rounded border-2 border-dashed border-slate-300 bg-white p-6 text-center transition-all min-h-[110px]",
              dragActive ? "border-slate-800 bg-slate-50/50" : "hover:bg-slate-50/30",
              isFrozen && "opacity-50 cursor-not-allowed"
            )}
          >
            <input
              type="file"
              accept=".ofx,.csv,.pdf,.xls,.xlsx"
              onChange={handleFileChange}
              disabled={uploading || isPending || isFrozen}
              className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-1">
                <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
                <span className="text-xs font-semibold text-slate-600">Processando extrato...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <FileUp className="h-6 w-6 text-slate-400" />
                <p className="text-xs font-medium text-slate-600">
                  Arraste seu arquivo (OFX, PDF, CSV, XLSX) ou clique para importar
                </p>
                <p className="text-[10px] text-slate-400 font-mono">OFX / CSV / PDF / XLSX suportados</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Worklist Spreadsheet Layout */}
      <div className="rounded border border-slate-200 bg-white shadow-sm flex flex-col overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Linhas do Extrato ({transactionLines.length})
          </span>
        </div>

        {transactionLines.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium">
            <Check className="mx-auto h-10 w-10 text-emerald-500 bg-emerald-50 p-2 rounded-full mb-3" />
            Nenhuma sugestão pendente ou linha no extrato. Faça o upload de um arquivo acima.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full border-collapse text-left text-xs table-fixed">
              <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm text-xs">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-slate-200 uppercase tracking-wider text-slate-650 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 h-8 leading-none">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        style={{ width: header.column.getSize() }}
                        className="text-xs py-1 px-2 truncate font-bold"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {table.getRowModel().rows.map((row) => {
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "transition-all hover:bg-slate-50/80 dark:hover:bg-slate-900/10 h-8 leading-none",
                        row.getIsSelected() ? "bg-indigo-50/30 dark:bg-indigo-950/10" : "",
                        isFrozen && "opacity-60"
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          style={{ width: cell.column.getSize() }}
                          className="text-xs py-1 px-2 truncate whitespace-nowrap leading-none align-middle"
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FLOATING BULK BAR (SAP Fiori Horizon Style) */}
      {selectedRows.length >= 1 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-wrap items-center gap-4 rounded-full border border-slate-200/80 bg-white/95 px-6 py-3.5 shadow-xl backdrop-blur animate-in fade-in slide-in-from-bottom-4 duration-300 dark:border-slate-850 dark:bg-slate-950/95 dark:text-slate-200">
          <div className="flex items-center gap-2 border-r border-slate-200 pr-4 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {selectedRows.length} selecionado{selectedRows.length > 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={() => setRowSelection({})}
              className="text-[10px] uppercase font-bold text-slate-400 hover:text-slate-650 transition-colors"
            >
              Limpar
            </button>
          </div>

          {/* Categoria Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Categoria:</span>
            <CategoryCombobox
              categories={localCategories}
              selectedId={bulkCategoryId}
              onChange={(id) => setBulkCategoryId(id)}
              onCreateCategory={async (name) => {
                const res = await createInlineCategory({ name, type: "DESPESA" });
                if (res.categoryId) {
                  const newCat = { id: res.categoryId, name };
                  setLocalCategories((prev) => [...prev, newCat]);
                  setBulkCategoryId(res.categoryId);
                } else {
                  setErrorMsg(res.error || "Erro ao criar categoria");
                }
              }}
            />
          </div>

          {/* Date de lançamento */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">Lançamento:</span>
            <input
              type="date"
              value={bulkDate}
              onChange={(e) => setBulkDate(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            />
          </div>

          {/* Date de pagamento */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">Pagamento:</span>
            <input
              type="date"
              value={bulkDataCaixa}
              onChange={(e) => setBulkDataCaixa(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            />
          </div>

          {/* violet-600 Efetivar Button */}
          <button
            type="button"
            onClick={handleBulkApprove}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 hover:bg-violet-750 disabled:opacity-50 px-5 py-2 text-xs font-bold text-white shadow-md shadow-violet-500/20 transition-all focus:ring-2 focus:ring-violet-500 hover:scale-[1.02]"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            [✅ Efetivar Selecionados]
          </button>
        </div>
      )}

      {/* FOOTER: Card de Consistência Matemática */}
      <div className="rounded border border-slate-200 bg-slate-50 p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Inicial</label>
            <input
              type="number"
              value={initialBalance}
              onChange={(e) => setInitialBalance(Number(e.target.value))}
              placeholder="0,00"
              className="w-24 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs outline-none text-right"
            />
          </div>
          <div className="text-slate-400 self-end mb-1 font-mono">
            {netMovimentation >= 0 ? "+" : "-"} {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Math.abs(netMovimentation))} (Movimentação)
          </div>
          <div className="text-slate-400 self-end mb-1 font-mono">=</div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Final (Esperado)</label>
            <input
              type="number"
              value={finalBalance}
              onChange={(e) => setFinalBalance(Number(e.target.value))}
              placeholder="0,00"
              className="w-24 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs outline-none text-right"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-medium">Consistência:</span>
          <span className={cn(
            "rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
            isConsistent
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-red-50 text-red-700 border-red-200"
          )}>
            {isConsistent ? "Saldo Consistente" : "Divergência de Saldo"}
          </span>
        </div>
      </div>

      {/* HISTÓRICO: Abas colapsáveis (Accordion) */}
      <div className="rounded border border-slate-200 bg-white shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          className="w-full flex items-center justify-between bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 hover:bg-slate-100 transition-colors"
        >
          <span>Histórico de Uploads Anteriores</span>
          {isHistoryOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {isHistoryOpen && (
          <div className="p-2 overflow-x-auto">
            <table className="w-full border-collapse text-left text-[11px] font-sans">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-500 uppercase">
                  <th className="px-2 py-1.5">Data/Hora</th>
                  <th className="px-2 py-1.5">Arquivo</th>
                  <th className="px-2 py-1.5">Conta Associada</th>
                  <th className="px-2 py-1.5 text-center">Transações</th>
                  <th className="px-2 py-1.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400 font-medium">
                      Nenhum histórico de importação encontrado.
                    </td>
                  </tr>
                ) : (
                  history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-2 py-1.5 font-mono text-slate-500">
                        {new Date(item.createdAt).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-2 py-1.5 font-semibold text-slate-800">{item.fileName}</td>
                      <td className="px-2 py-1.5 text-slate-600">{item.account?.name || "—"}</td>
                      <td className="px-2 py-1.5 text-center font-mono">{item.transactionsCount}</td>
                      <td className="px-2 py-1.5 text-center">
                        <span className={cn(
                          "inline-block rounded px-1.5 py-0.5 text-[9px] font-bold border uppercase",
                          item.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : item.status === "ERROR"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        )}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
