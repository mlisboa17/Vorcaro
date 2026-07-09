"use client";

import { useCallback, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CreditCard,
  FileUp,
  Loader2,
  Building2,
  ChevronRight,
  X,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { FinanceCatalog } from "@/types/inbox";
import type {
  ExtractedBankStatementTransaction,
  ExtractedInstallmentPurchase,
  FinancialDocumentBatchReview,
} from "@/modules/financial-documents/domain/types/financial-document-import.types";

type Step = "type" | "upload" | "review" | "done";
type DocType = "extrato" | "fatura";

function formatBrl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(s: string) {
  return s.slice(0, 10).split("-").reverse().join("/");
}

// ─── Step 1: choose document type ─────────────────────────────────────────────
function TypeStep({ onSelect }: { onSelect: (t: DocType) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-500">
        Selecione o tipo de documento para importar:
      </p>
      <button
        type="button"
        onClick={() => onSelect("extrato")}
        className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-indigo-400 hover:shadow-md transition-all"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50">
          <Building2 className="h-5 w-5 text-indigo-600" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-900">Extrato de Conta Corrente</p>
          <p className="text-xs text-slate-500">OFX ou CSV — transações de conta bancária</p>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-400" />
      </button>
      <button
        type="button"
        onClick={() => onSelect("fatura")}
        className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-violet-400 hover:shadow-md transition-all"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50">
          <CreditCard className="h-5 w-5 text-violet-600" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-900">Fatura de Cartão de Crédito</p>
          <p className="text-xs text-slate-500">
            PDF, OFX ou CSV — parcelas detectadas automaticamente e lançadas no vencimento do cartão
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-400" />
      </button>
    </div>
  );
}

// ─── Step 2: select account/card + upload ─────────────────────────────────────
function UploadStep({
  docType,
  catalog,
  onUploaded,
  onBack,
}: {
  docType: DocType;
  catalog: FinanceCatalog;
  onUploaded: (documentId: string, cardId: string | null, accountId: string | null) => void;
  onBack: () => void;
}) {
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFatura = docType === "fatura";
  const acceptedFormats = isFatura ? ".pdf,.ofx,.csv" : ".ofx,.csv";

  async function handleFile(file: File) {
    if (isFatura && !selectedCardId) {
      setError("Selecione o cartão antes de enviar a fatura.");
      return;
    }
    if (!isFatura && !selectedAccountId) {
      setError("Selecione a conta bancária antes de enviar o extrato.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (selectedCardId) formData.append("cardId", selectedCardId);
      if (selectedAccountId) formData.append("accountId", selectedAccountId);

      const res = await fetch("/api/import/documents", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = (await res.json()) as {
        document?: { id: string };
        error?: string;
        action?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Falha ao processar arquivo.");
      }

      if (!data.document?.id) {
        throw new Error("Resposta inválida do servidor.");
      }

      onUploaded(
        data.document.id,
        selectedCardId || null,
        selectedAccountId || null,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar arquivo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </button>

      {isFatura ? (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Cartão de crédito
          </label>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            value={selectedCardId}
            onChange={(e) => setSelectedCardId(e.target.value)}
          >
            <option value="">Selecione o cartão...</option>
            {catalog.cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.lastFourDigits ? ` •••• ${c.lastFourDigits}` : ""}
                {c.institutionName ? ` — ${c.institutionName}` : ""}
              </option>
            ))}
          </select>
          {selectedCardId && (
            <p className="mt-1 text-xs text-violet-600">
              As parcelas futuras serão lançadas automaticamente no dia de vencimento deste cartão.
            </p>
          )}
        </div>
      ) : (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Conta bancária
          </label>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
          >
            <option value="">Selecione a conta...</option>
            {catalog.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.institutionName ? ` — ${a.institutionName}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) void handleFile(file);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-all",
          uploading
            ? "cursor-wait border-violet-300 bg-violet-50"
            : "border-slate-300 hover:border-violet-400 hover:bg-violet-50/40",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
          disabled={uploading}
        />
        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            <p className="text-sm font-medium text-violet-700">Processando arquivo...</p>
          </>
        ) : (
          <>
            <FileUp className="h-8 w-8 text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-700">
                Clique ou arraste o arquivo aqui
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {isFatura ? "PDF, OFX ou CSV" : "OFX ou CSV"} — máx. 10 MB
              </p>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

// ─── Step 3: review batch ─────────────────────────────────────────────────────
function ReviewStep({
  documentId,
  cardId,
  accountId,
  catalog,
  onConfirmed,
  onBack,
}: {
  documentId: string;
  cardId: string | null;
  accountId: string | null;
  catalog: FinanceCatalog;
  onConfirmed: (stats: { transactions: number; installments: number; skipped: number }) => void;
  onBack: () => void;
}) {
  const [batchReview, setBatchReview] = useState<FinancialDocumentBatchReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set());
  const [installmentActions, setInstallmentActions] = useState<Record<string, boolean>>({});
  const [resolvedAccountId, setResolvedAccountId] = useState<string>(accountId ?? "");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/import/documents/${documentId}/lines`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Falha ao carregar linhas do documento.");
      const data = (await res.json()) as {
        batchReview: FinancialDocumentBatchReview | null;
      };
      if (!data.batchReview) throw new Error("Documento não possui revisão de lote.");
      setBatchReview(data.batchReview);
      const allIds = new Set(data.batchReview.bankStatementTransactions.map((t) => t.id));
      setSelectedLineIds(allIds);
      const initActions: Record<string, boolean> = {};
      for (const p of data.batchReview.installmentPurchases) {
        initActions[p.id] = true;
      }
      setInstallmentActions(initActions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar revisão.");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useState(() => {
    void load();
  });

  // useEffect equivalent via ref trick — load on mount
  const loaded = useRef(false);
  if (!loaded.current) {
    loaded.current = true;
    void load();
  }

  function toggleLine(id: string) {
    setSelectedLineIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    if (!batchReview) return;
    if (checked) {
      setSelectedLineIds(new Set(batchReview.bankStatementTransactions.map((t) => t.id)));
    } else {
      setSelectedLineIds(new Set());
    }
  }

  async function confirm() {
    setConfirming(true);
    setError(null);
    try {
      const actions = Object.entries(installmentActions).map(([purchaseId, createFutureInstallments]) => ({
        purchaseId,
        createFutureInstallments,
        ...(cardId ? { cardId } : {}),
      }));

      const res = await fetch(`/api/import/documents/${documentId}/lines`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedLineIds: [...selectedLineIds],
          installmentActions: actions,
          accountId: resolvedAccountId || undefined,
        }),
      });

      const data = (await res.json()) as {
        transactionIds?: string[];
        installmentResults?: Array<{ createdCount: number; skipped: number }>;
        skippedDuplicates?: number;
        error?: string;
      };

      if (!res.ok) throw new Error(data.error ?? "Falha ao confirmar importação.");

      const installmentCreated = (data.installmentResults ?? []).reduce(
        (sum, r) => sum + r.createdCount,
        0,
      );
      const installmentSkipped = (data.installmentResults ?? []).reduce(
        (sum, r) => sum + r.skipped,
        0,
      );

      onConfirmed({
        transactions: data.transactionIds?.length ?? 0,
        installments: installmentCreated,
        skipped: (data.skippedDuplicates ?? 0) + installmentSkipped,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao confirmar.");
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
        <button type="button" onClick={onBack} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </button>
      </div>
    );
  }

  if (!batchReview) return null;

  const allSelected =
    batchReview.bankStatementTransactions.length > 0 &&
    batchReview.bankStatementTransactions.every((t) => selectedLineIds.has(t.id));

  return (
    <div className="flex flex-col gap-5">
      {/* Account selector (for card invoices that don't have an account pre-selected) */}
      {!accountId && catalog.accounts.length > 0 && (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Conta para lançar as transações
          </label>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            value={resolvedAccountId}
            onChange={(e) => setResolvedAccountId(e.target.value)}
          >
            <option value="">Selecione a conta...</option>
            {catalog.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Transações do extrato */}
      {batchReview.bankStatementTransactions.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              Transações ({batchReview.bankStatementTransactions.length})
            </h3>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => toggleAll(e.target.checked)}
                className="h-3.5 w-3.5 rounded"
              />
              Selecionar todas
            </label>
          </div>
          <ul className="max-h-60 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
            {batchReview.bankStatementTransactions.map((tx) => (
              <li
                key={tx.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50",
                  !selectedLineIds.has(tx.id) && "opacity-50",
                )}
                onClick={() => toggleLine(tx.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedLineIds.has(tx.id)}
                  onChange={() => toggleLine(tx.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-3.5 w-3.5 rounded shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-slate-900">{tx.description}</p>
                  <p className="text-xs text-slate-500">{formatDate(tx.date)}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 font-semibold",
                    tx.direction === "INCOME" ? "text-emerald-700" : "text-rose-700",
                  )}
                >
                  {tx.direction === "INCOME" ? "+" : "-"}
                  {formatBrl(tx.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Compras parceladas detectadas */}
      {batchReview.installmentPurchases.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">
            Compras parceladas detectadas ({batchReview.installmentPurchases.length})
          </h3>
          <p className="mb-2 text-xs text-slate-500">
            Marque quais compras devem ter as parcelas futuras criadas automaticamente no vencimento do cartão.
          </p>
          <ul className="divide-y divide-slate-100 rounded-lg border border-violet-200 bg-violet-50/40 text-sm">
            {batchReview.installmentPurchases.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-3">
                <input
                  type="checkbox"
                  checked={installmentActions[p.id] ?? true}
                  onChange={(e) =>
                    setInstallmentActions((prev) => ({ ...prev, [p.id]: e.target.checked }))
                  }
                  className="h-3.5 w-3.5 rounded shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-slate-900">{p.merchant}</p>
                  <p className="text-xs text-slate-500">
                    Parcela {p.currentInstallment}/{p.totalInstallments} ·{" "}
                    {formatBrl(p.installmentAmount)}/parcela
                    {p.totalAmount ? ` · Total ${formatBrl(p.totalAmount)}` : ""}
                  </p>
                </div>
                {installmentActions[p.id] && (
                  <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                    +{p.totalInstallments - p.currentInstallment} parcelas futuras
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {batchReview.bankStatementTransactions.length === 0 &&
        batchReview.installmentPurchases.length === 0 && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Nenhuma transação identificada no documento. Verifique o formato do arquivo.
          </p>
        )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </button>
        <button
          type="button"
          onClick={() => void confirm()}
          disabled={
            confirming ||
            (selectedLineIds.size === 0 && Object.values(installmentActions).every((v) => !v))
          }
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Confirmar importação
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: done ─────────────────────────────────────────────────────────────
function DoneStep({
  stats,
  onReset,
}: {
  stats: { transactions: number; installments: number; skipped: number };
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
        <Check className="h-7 w-7 text-emerald-600" />
      </div>
      <div>
        <p className="text-lg font-semibold text-slate-900">Importação concluída!</p>
        <p className="mt-1 text-sm text-slate-500">
          {stats.transactions} transação(ões) importada(s)
          {stats.installments > 0 && ` · ${stats.installments} parcelas futuras criadas`}
          {stats.skipped > 0 && ` · ${stats.skipped} ignorada(s) por duplicidade`}
        </p>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Importar outro arquivo
      </button>
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────
export function InvoiceImportWizard({
  catalog,
  onClose,
}: {
  catalog: FinanceCatalog;
  onClose?: () => void;
}) {
  const [step, setStep] = useState<Step>("type");
  const [docType, setDocType] = useState<DocType>("fatura");
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [doneStats, setDoneStats] = useState<{ transactions: number; installments: number; skipped: number } | null>(null);

  const stepLabel: Record<Step, string> = {
    type: "Tipo de documento",
    upload: "Upload",
    review: "Revisão",
    done: "Concluído",
  };
  const steps: Step[] = ["type", "upload", "review", "done"];
  const stepIdx = steps.indexOf(step);

  function reset() {
    setStep("type");
    setDocumentId(null);
    setCardId(null);
    setAccountId(null);
    setDoneStats(null);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Importar Extrato / Fatura</h2>
          <div className="mt-1.5 flex items-center gap-1.5">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold",
                    i < stepIdx
                      ? "bg-emerald-100 text-emerald-700"
                      : i === stepIdx
                        ? "bg-violet-600 text-white"
                        : "bg-slate-100 text-slate-400",
                  )}
                >
                  {i < stepIdx ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "text-xs",
                    i === stepIdx ? "font-medium text-slate-800" : "text-slate-400",
                  )}
                >
                  {stepLabel[s]}
                </span>
                {i < steps.length - 1 && (
                  <span className="text-slate-300">·</span>
                )}
              </div>
            ))}
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-5">
        {step === "type" && (
          <TypeStep
            onSelect={(t) => {
              setDocType(t);
              setStep("upload");
            }}
          />
        )}
        {step === "upload" && (
          <UploadStep
            docType={docType}
            catalog={catalog}
            onBack={() => setStep("type")}
            onUploaded={(docId, cId, aId) => {
              setDocumentId(docId);
              setCardId(cId);
              setAccountId(aId);
              setStep("review");
            }}
          />
        )}
        {step === "review" && documentId && (
          <ReviewStep
            documentId={documentId}
            cardId={cardId}
            accountId={accountId}
            catalog={catalog}
            onBack={() => setStep("upload")}
            onConfirmed={(stats) => {
              setDoneStats(stats);
              setStep("done");
            }}
          />
        )}
        {step === "done" && doneStats && (
          <DoneStep stats={doneStats} onReset={reset} />
        )}
      </div>
    </div>
  );
}
