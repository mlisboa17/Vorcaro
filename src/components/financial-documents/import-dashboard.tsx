"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, FileUp, Loader2, Pencil, Upload } from "lucide-react";
import {
  acceptForBankImportFormat,
  BankImportFormatPicker,
  formatHintForFileName,
  isStructuredImportFormat,
  labelForFileName,
  type BankImportFormatChoice,
} from "@/components/financial-documents/bank-import-format-picker";
import { ImportSummaryCards } from "@/components/financial-documents/import-summary-cards";
import { SettingsToastProvider, useSettingsToast } from "@/components/settings/settings-toast";
import { fetchInstrumentList } from "@/lib/instruments/instrument-api";
import type { ConfigConta } from "@/types/instruments-config";
import type {
  ImportConfirmRequest,
  ImportPreviewResponse,
} from "@/modules/financial-inbox/domain/schemas/financial-import-api.schema";
import { AUTO_APPROVAL_THRESHOLD } from "@/modules/financial-documents/domain/constants/financial-document-review.constants";
import type { FinancialDocumentBatchReview } from "@/modules/financial-documents/domain/types/financial-document-import.types";
import { cn } from "@/lib/utils/cn";

type CategoryOption = { id: string; name: string; parentCategoryId: string | null };

type PartiesView = {
  payerName: string;
  payerDocument: string;
  payerBank: string;
  receiverName: string;
  receiverDocument: string;
  receiverBank: string;
  pixKey: string;
  transactionIdentifier: string;
};

type SuggestionItem = {
  id: string;
  documentId: string;
  method: string | null;
  amount: number | null;
  date: string | null;
  description: string | null;
  supplier: string | null;
  confidence: number;
  isLearnedPattern: boolean;
  suggestedCategoryLabel: string | null;
  requiresMandatoryReview: boolean;
  confidenceReasons: string[];
  ocrText: string | null;
  parties: PartiesView;
  extractedFields: {
    payeeName: string | null;
    bank: string | null;
    cpfCnpj: string | null;
    pixKey: string | null;
    documentNumber: string | null;
  };
  categoryId: string | null;
  subcategoryId: string | null;
  fileName: string;
  batchReview: FinancialDocumentBatchReview | null;
};

type HistoryItem = {
  id: string;
  fileName: string;
  status: string;
  method: string | null;
  createdAt: string;
  confidence: number | null;
  suggestedCategoryLabel: string | null;
  finalCategoryLabel: string | null;
  learningApplied: boolean;
  suggestionStatus: string | null;
  processingError: string | null;
  archived?: boolean;
  parties: PartiesView;
};

type PasswordDoc = { id: string; fileName: string };

function formatMoney(value: number | null) {
  if (value == null) return "—";
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

function formatMethod(method?: string | null) {
  if (!method) return "—";
  const labels: Record<string, string> = {
    PIX: "PIX",
    TRANSFERENCIA: "Transferência",
    BOLETO: "Boleto",
    CARTAO_CREDITO: "Cartão",
    TARIFA: "Tarifa",
    OUTROS: "Outros",
  };
  return labels[method] ?? method;
}

function formatParseStatus(status?: string) {
  switch (status) {
    case "RECOGNIZED":
      return "Reconhecido";
    case "NEEDS_REVIEW":
      return "Precisa revisar";
    case "IGNORED":
      return "Ignorado";
    case "ERROR":
      return "Erro";
    default:
      return "Reconhecido";
  }
}

function parseStatusRowClass(status?: string) {
  if (status === "NEEDS_REVIEW") return "bg-amber-50";
  if (status === "ERROR") return "bg-red-50";
  return "";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
}

function ImportDashboardInner({ mode }: { mode: "upload" | "review" | "history" }) {
  const router = useRouter();
  const { pushToast } = useSettingsToast();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [patterns, setPatterns] = useState<Array<Record<string, unknown>>>([]);
  const [passwordDocs, setPasswordDocs] = useState<PasswordDoc[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [expandedOcr, setExpandedOcr] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reviewAck, setReviewAck] = useState<Record<string, boolean>>({});
  const [editForms, setEditForms] = useState<
    Record<string, { amount: string; date: string; description: string; supplier: string; categoryId: string; subcategoryId: string }>
  >({});
  const [passwordInputs, setPasswordInputs] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [batchLineSelection, setBatchLineSelection] = useState<Record<string, Record<string, boolean>>>({});
  const [batchLineEdits, setBatchLineEdits] = useState<
    Record<string, Record<string, { date?: string; description?: string; amount?: string }>>
  >({});
  const [installmentCreateChoice, setInstallmentCreateChoice] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [importFormat, setImportFormat] = useState<BankImportFormatChoice>("PDF");
  const [structuredFile, setStructuredFile] = useState<File | null>(null);
  const [structuredPreview, setStructuredPreview] = useState<ImportPreviewResponse | null>(null);
  const [structuredContaId, setStructuredContaId] = useState("");
  const [contas, setContas] = useState<ConfigConta[]>([]);
  const [structuredBusy, setStructuredBusy] = useState(false);
  const structuredInputRef = useRef<HTMLInputElement>(null);
  const resendInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const requests: Promise<Response>[] = [
        fetch("/api/import/suggestions?status=PENDING"),
        fetch("/api/import/learning-patterns"),
        fetch("/api/finance/catalog"),
      ];
      if (mode === "upload") {
        fetchInstrumentList<ConfigConta>("/api/config/contas")
          .then(setContas)
          .catch(() => setContas([]));
      }
      if (mode === "history" || mode === "upload" || mode === "review") {
        requests.push(fetch("/api/import/documents?enriched=true"));
      }
      const [sugRes, patRes, catRes, docsRes] = await Promise.all(requests);

      if (sugRes.ok) {
        const data = (await sugRes.json()) as { items: SuggestionItem[] };
        setSuggestions(data.items);
      }
      if (patRes.ok) {
        const data = (await patRes.json()) as { items: Array<Record<string, unknown>> };
        setPatterns(data.items);
      }
      if (catRes.ok) {
        const data = (await catRes.json()) as { categories: CategoryOption[] };
        setCategories(data.categories ?? []);
      }
      if (docsRes?.ok) {
        const data = (await docsRes.json()) as { items: HistoryItem[] };
        if (mode === "history") {
          setHistory(data.items);
        } else if (mode === "review") {
          setHistory(
            data.items.filter((d) =>
              ["FAILED", "REJECTED", "PASSWORD_REQUIRED"].includes(d.status),
            ),
          );
        } else {
          setPasswordDocs(
            data.items
              .filter((d) => d.status === "PASSWORD_REQUIRED")
              .map((d) => ({ id: d.id, fileName: d.fileName })),
          );
        }
      }
    } catch {
      pushToast("error", "Falha ao carregar importações.");
    } finally {
      setLoading(false);
    }
  }, [mode, pushToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function uploadFile(file: File) {
    if (isStructuredImportFormat(importFormat)) {
      setStructuredFile(file);
      setStructuredPreview(null);
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/import/documents", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        action?: string;
        code?: string;
        processing?: { status?: string };
      };
      if (!res.ok) {
        pushToast("error", data.error ?? data.message ?? "Upload falhou");
        return;
      }
      if (data.action === "existing_active") {
        pushToast("success", data.message ?? "Este documento já está em revisão ou processamento.");
      } else if (data.action === "recovered") {
        if (data.processing?.status === "PASSWORD_REQUIRED") {
          pushToast("success", "PDF protegido — informe a senha abaixo.");
        } else {
          pushToast("success", data.message ?? "Documento recuperado. Processando novamente…");
        }
      } else if (data.processing?.status === "PASSWORD_REQUIRED") {
        pushToast("success", "PDF protegido — informe a senha abaixo.");
      } else {
        pushToast("success", "Documento enviado. Revise a sugestão gerada.");
      }
      await load();
    } finally {
      setUploading(false);
    }
  }

  async function generateStructuredPreview() {
    if (!structuredFile) return;
    if (!structuredContaId) {
      pushToast("error", "Selecione a conta financeira de destino.");
      return;
    }

    setStructuredBusy(true);
    try {
      const formData = new FormData();
      formData.set("file", structuredFile);
      formData.set("tipo", "EXTRATO_BANCARIO");
      formData.set("contaFinanceiraId", structuredContaId);

      const response = await fetch("/api/inbox/import/preview", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const body = (await response.json().catch(() => null)) as ImportPreviewResponse & { error?: string };
      if (!response.ok) {
        pushToast("error", body?.error ?? "Falha ao gerar prévia do arquivo.");
        return;
      }
      setStructuredPreview(body);
    } finally {
      setStructuredBusy(false);
    }
  }

  async function uploadDirectOfx() {
    if (!structuredFile) return;
    if (!structuredContaId) {
      pushToast("error", "Selecione a conta financeira de destino.");
      return;
    }

    setStructuredBusy(true);
    try {
      const formData = new FormData();
      formData.set("file", structuredFile);
      formData.set("accountId", structuredContaId);

      const response = await fetch("/api/dashboard/statements/import", {
        method: "POST",
        body: formData,
      });

      const body = await response.json();

      if (!response.ok) {
        pushToast("error", body?.error ?? "Falha ao importar o arquivo.");
        return;
      }

      pushToast(
        "success",
        `Sucesso! ${body.data.importedCount} novas transações importadas, ${body.data.ignoredCount} ignoradas (já existiam).`
      );

      setStructuredFile(null);
      setStructuredPreview(null);
      
      // Força a atualização dos dados do servidor para a aba "Extratos"
      router.refresh();
      await load();
    } catch (error) {
      pushToast("error", "Erro inesperado durante a importação.");
    } finally {
      setStructuredBusy(false);
    }
  }

  async function confirmStructuredImport() {
    if (!structuredPreview) return;

    setStructuredBusy(true);
    try {
      const requestBody: ImportConfirmRequest = {
        importType: structuredPreview.importType,
        sourceFileName: structuredPreview.sourceFileName,
        contaFinanceiraId: structuredContaId,
        skipDuplicates: true,
        lines: structuredPreview.lines.map((line) => ({
          lineIndex: line.lineIndex,
          rawContent: line.rawContent,
          importHash: line.importHash,
          ...(line.externalId ? { externalId: line.externalId } : {}),
          ...(line.date ? { date: line.date } : {}),
          ...(line.description ? { description: line.description } : {}),
          ...(typeof line.amount === "number" ? { amount: line.amount } : {}),
        })),
      };

      const response = await fetch("/api/inbox/import/confirm", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; imported?: number };
      if (!response.ok) {
        pushToast("error", body.error ?? "Falha ao confirmar importação.");
        return;
      }
      pushToast(
        "success",
        `${body.imported ?? 0} lançamentos enviados para a Caixa Financeira.`,
      );
      setStructuredFile(null);
      setStructuredPreview(null);
      await load();
    } finally {
      setStructuredBusy(false);
    }
  }

  function pickStructuredFile() {
    structuredInputRef.current?.click();
  }

  function pickDocumentFile() {
    resendInputRef.current?.click();
  }

  async function submitPassword(documentId: string) {
    const password = passwordInputs[documentId]?.trim();
    if (!password) {
      pushToast("error", "Informe a senha do PDF.");
      return;
    }
    setActionLoading(documentId);
    try {
      const res = await fetch(`/api/import/documents/${documentId}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        pushToast("error", data.error ?? "Senha inválida ou falha no processamento.");
        return;
      }
      pushToast("success", "Documento processado. Revise a sugestão.");
      setPasswordInputs((prev) => ({ ...prev, [documentId]: "" }));
      await load();
    } finally {
      setActionLoading(null);
    }
  }

  async function rejectDocument(documentId: string) {
    setActionLoading(documentId);
    try {
      const res = await fetch(`/api/import/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        pushToast("error", data.error ?? "Não foi possível rejeitar documento");
        return;
      }
      pushToast("success", "Documento rejeitado.");
      await load();
    } finally {
      setActionLoading(null);
    }
  }

  function openEdit(s: SuggestionItem) {
    setEditingId(s.id);
    setEditForms((prev) => ({
      ...prev,
      [s.id]: {
        amount: s.amount != null ? String(s.amount) : "",
        date: s.date ? new Date(s.date).toISOString().slice(0, 10) : "",
        description: s.description ?? "",
        supplier: s.supplier ?? "",
        categoryId: s.categoryId ?? "",
        subcategoryId: s.subcategoryId ?? "",
      },
    }));
  }

  async function saveEdit(id: string) {
    const form = editForms[id];
    if (!form) return;
    const res = await fetch(`/api/import/suggestions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: form.amount ? Number(form.amount) : undefined,
        date: form.date || undefined,
        description: form.description || undefined,
        supplier: form.supplier || undefined,
        categoryId: form.categoryId || undefined,
        subcategoryId: form.subcategoryId || undefined,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      pushToast("error", data.error ?? "Não foi possível salvar edição");
      return;
    }
    pushToast("success", "Sugestão atualizada.");
    setEditingId(null);
    setReviewAck((prev) => ({ ...prev, [id]: true }));
    await load();
  }

  async function approveSuggestion(id: string, requiresReview: boolean) {
    const res = await fetch(`/api/import/suggestions/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        acknowledgedLowConfidence: requiresReview ? reviewAck[id] === true : undefined,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    if (!res.ok) {
      if (data.code === "LOW_CONFIDENCE_REVIEW_REQUIRED") {
        pushToast("error", "Revise e confirme os dados antes de aprovar.");
      } else {
        pushToast("error", data.error ?? "Não foi possível aprovar");
      }
      return;
    }
    pushToast("success", "Lançamento criado após sua confirmação.");
    await load();
  }

  async function rejectSuggestion(id: string) {
    const res = await fetch(`/api/import/suggestions/${id}/reject`, { method: "POST" });
    if (!res.ok) {
      pushToast("error", "Não foi possível rejeitar");
      return;
    }
    pushToast("success", "Sugestão rejeitada.");
    await load();
  }

  async function reprocessDocument(documentId: string, password?: string) {
    setActionLoading(documentId);
    try {
      const res = await fetch(`/api/import/documents/${documentId}/reprocess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(password ? { password } : {}),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        pushToast("error", data.error ?? "Falha ao reprocessar documento");
        return;
      }
      pushToast("success", "Documento reprocessado.");
      await load();
    } finally {
      setActionLoading(null);
    }
  }

  async function reopenDocument(documentId: string) {
    setActionLoading(documentId);
    try {
      const res = await fetch(`/api/import/documents/${documentId}/reopen`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        pushToast("error", data.error ?? "Falha ao reabrir documento");
        return;
      }
      pushToast("success", "Documento reaberto para revisão.");
      await load();
    } finally {
      setActionLoading(null);
    }
  }

  function PartiesPanel({ parties }: { parties: PartiesView }) {
    return (
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-800">Quem pagou</p>
          <dl className="mt-2 space-y-1 text-sm">
            <div>
              <dt className="text-slate-500">Nome</dt>
              <dd className="font-medium text-slate-900">{parties.payerName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Documento</dt>
              <dd className="font-medium text-slate-900">{parties.payerDocument}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Banco</dt>
              <dd className="font-medium text-slate-900">{parties.payerBank}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-800">Quem recebeu</p>
          <dl className="mt-2 space-y-1 text-sm">
            <div>
              <dt className="text-slate-500">Nome</dt>
              <dd className="font-medium text-slate-900">{parties.receiverName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Documento</dt>
              <dd className="font-medium text-slate-900">{parties.receiverDocument}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Banco</dt>
              <dd className="font-medium text-slate-900">{parties.receiverBank}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Chave PIX</dt>
              <dd className="font-medium text-slate-900">{parties.pixKey}</dd>
            </div>
          </dl>
        </div>
      </div>
    );
  }

  function DocumentRecoveryActions({ doc }: { doc: HistoryItem }) {
    const busy = actionLoading === doc.id;
    if (doc.status === "APPROVED") {
      return <p className="mt-3 text-sm text-slate-600">Documento já aprovado</p>;
    }
    if (doc.status === "FAILED" || (doc.status === "REJECTED" && !doc.archived)) {
      return (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void reopenDocument(doc.id)}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Reabrir revisão
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void reprocessDocument(doc.id)}
            className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50"
          >
            Reprocessar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => resendInputRef.current?.click()}
            className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50"
          >
            Enviar novamente
          </button>
        </div>
      );
    }
    if (doc.status === "PASSWORD_REQUIRED") {
      return (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !passwordInputs[doc.id]?.trim()}
            onClick={() => void reprocessDocument(doc.id, passwordInputs[doc.id])}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Reprocessar com senha
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void rejectDocument(doc.id)}
            className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50"
          >
            Rejeitar
          </button>
        </div>
      );
    }
    return null;
  }

  async function confirmBatchImport(s: SuggestionItem) {
    const batch = s.batchReview;
    if (!batch) return;

    const selection = batchLineSelection[s.id] ?? {};
    const selectedLineIds = batch.bankStatementTransactions
      .filter((line) => selection[line.id] !== false)
      .map((line) => line.id);

    const installmentActions = batch.installmentPurchases.map((purchase) => ({
      purchaseId: purchase.id,
      createFutureInstallments: installmentCreateChoice[s.id]?.[purchase.id] === true,
    }));

    if (selectedLineIds.length === 0 && !installmentActions.some((a) => a.createFutureInstallments)) {
      pushToast("error", "Selecione lançamentos ou confirme parcelas futuras.");
      return;
    }

    const lineEditsMap = batchLineEdits[s.id] ?? {};
    const invalidSelected = batch.bankStatementTransactions.filter((line) => {
      if (!selectedLineIds.includes(line.id)) return false;
      const editAmount = lineEditsMap[line.id]?.amount;
      const amount = editAmount ? Number(editAmount.replace(",", ".")) : line.amount;
      return !amount || amount <= 0;
    });
    if (invalidSelected.length > 0) {
      pushToast(
        "error",
        `${invalidSelected.length} lançamento(s) selecionado(s) sem valor válido. Informe o valor manualmente.`,
      );
      return;
    }

    setActionLoading(s.documentId);
    try {
      const lines = Object.entries(lineEditsMap).map(([id, edit]) => ({
        id,
        ...(edit.date ? { date: edit.date } : {}),
        ...(edit.description ? { description: edit.description } : {}),
        ...(edit.amount ? { amount: Number(edit.amount.replace(",", ".")) } : {}),
      }));

      const res = await fetch(`/api/import/documents/${s.documentId}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedLineIds,
          installmentActions,
          ...(lines.length > 0 ? { lines } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        pushToast("error", data.error ?? "Falha ao confirmar importação");
        return;
      }
      pushToast("success", "Lançamentos confirmados após sua revisão.");
      await load();
    } finally {
      setActionLoading(null);
    }
  }

  async function deletePattern(id: string) {
    const res = await fetch(`/api/import/learning-patterns/${id}`, { method: "DELETE" });
    if (!res.ok) {
      pushToast("error", "Não foi possível remover padrão");
      return;
    }
    pushToast("success", "Padrão removido.");
    await load();
  }

  const rootCategories = categories.filter((c) => !c.parentCategoryId);
  const subcategories = (parentId: string) =>
    categories.filter((c) => c.parentCategoryId === parentId);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Importação inteligente</h1>
        <p className="mt-1 text-sm text-slate-500">
          Envie comprovantes e extratos. O Vorcaro sugere lançamentos — nada é criado sem sua confirmação.
        </p>
        <nav className="mt-4 flex flex-wrap gap-2 text-sm">
          {(
            [
              ["/dashboard/statements?tab=import", "Upload"],
              ["/dashboard/statements?tab=layout-training", "Treinamento de Extratos"],
              ["/dashboard/statements?tab=import-review", "Revisão"],
              ["/dashboard/statements?tab=import-history", "Histórico"],
            ] as const
          ).map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-lg border px-3 py-1.5",
                (href.includes("tab=import") && mode === "upload") ||
                  (href.includes("tab=import-review") && mode === "review") ||
                  (href.includes("tab=import-history") && mode === "history")
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : null}

      <input
        ref={structuredInputRef}
        type="file"
        accept={acceptForBankImportFormat(importFormat)}
        className="hidden"
        disabled={uploading || structuredBusy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void uploadFile(file);
        }}
      />

      <input
        ref={resendInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void uploadFile(file);
        }}
      />

      {!loading && mode === "upload" ? (
        <>
          <BankImportFormatPicker
            selected={importFormat}
            onSelect={(format) => {
              setImportFormat(format);
              setStructuredFile(null);
              setStructuredPreview(null);
            }}
          />

          {isStructuredImportFormat(importFormat) ? (
            <section className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-base font-semibold text-slate-900">
                {importFormat === "OFX"
                  ? "Importar OFX"
                  : importFormat === "CSV"
                    ? "Importar CSV"
                    : "Importar Excel"}
              </h2>
              <p className="text-sm text-slate-600">
                Este formato é estruturado e costuma ter melhor reconhecimento que PDF.
              </p>

              <label className="block max-w-md space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Conta financeira</span>
                <select
                  value={structuredContaId}
                  onChange={(e) => setStructuredContaId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Selecione a conta…</option>
                  {contas.map((conta) => (
                    <option key={conta.id} value={conta.id}>
                      {conta.nome}
                      {conta.nomeInstituicao ? ` (${conta.nomeInstituicao})` : ""}
                    </option>
                  ))}
                </select>
              </label>

              {structuredFile ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                  <p className="font-medium text-slate-900">{structuredFile.name}</p>
                  <p className="text-xs text-slate-500">{labelForFileName(structuredFile.name)}</p>
                  {formatHintForFileName(structuredFile.name) ? (
                    <p className="mt-1 text-xs text-slate-600">
                      {formatHintForFileName(structuredFile.name)}
                    </p>
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={pickStructuredFile}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  <FileUp className="h-4 w-4" />
                  Selecionar arquivo
                </button>
              )}

              {structuredPreview?.importSummary ? (
                <ImportSummaryCards summary={structuredPreview.importSummary} />
              ) : null}

              {structuredPreview ? (
                <p className="text-sm text-slate-600">
                  Encontramos {structuredPreview.totals.total} lançamentos ·{" "}
                  {structuredPreview.totals.newCount} novos · {structuredPreview.totals.duplicateCount}{" "}
                  duplicados
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {structuredFile && (importFormat === "OFX" || importFormat === "CSV") && (
                  <button
                    type="button"
                    disabled={structuredBusy || !structuredContaId}
                    onClick={() => void uploadDirectOfx()}
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {structuredBusy ? (
                      <>
                        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      "Importar Arquivo (OFX/CSV)"
                    )}
                  </button>
                )}

                {structuredFile && importFormat !== "OFX" && importFormat !== "CSV" && !structuredPreview ? (
                  <button
                    type="button"
                    disabled={structuredBusy || !structuredContaId}
                    onClick={() => void generateStructuredPreview()}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {structuredBusy ? "Gerando prévia…" : "Gerar prévia"}
                  </button>
                ) : null}
                {structuredPreview && importFormat !== "OFX" && importFormat !== "CSV" ? (
                  <button
                    type="button"
                    disabled={structuredBusy}
                    onClick={() => void confirmStructuredImport()}
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {structuredBusy ? "Importando…" : "Confirmar importação"}
                  </button>
                ) : null}
                {structuredFile ? (
                  <button
                    type="button"
                    onClick={() => {
                      setStructuredFile(null);
                      setStructuredPreview(null);
                    }}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Trocar arquivo
                  </button>
                ) : null}
              </div>
            </section>
          ) : (
          <section
            className={cn(
              "mt-4 rounded-xl border-2 border-dashed p-10 text-center transition",
              dragOver ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) void uploadFile(file);
            }}
          >
            <Upload className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-3 font-medium text-slate-800">Importar PDF ou imagem (comprovante)</p>
            <p className="mt-1 text-sm text-slate-500">
              PDFs podem exigir mais revisão. Se o banco permitir, prefira OFX, CSV ou Excel acima.
            </p>
            <button
              type="button"
              onClick={pickDocumentFile}
              className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <FileUp className="h-4 w-4" />
              Selecionar arquivo
            </button>
            {uploading ? <p className="mt-3 text-sm text-slate-500">Processando…</p> : null}
          </section>
          )}

          {passwordDocs.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">PDFs aguardando senha</h2>
              {passwordDocs.map((doc) => (
                <article key={doc.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="font-medium text-slate-900">{doc.fileName}</p>
                  <p className="mt-1 text-sm text-amber-800">
                    Este documento está protegido por senha. Informe a senha para continuar o processamento.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input
                      type="password"
                      placeholder="Senha do PDF"
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                      value={passwordInputs[doc.id] ?? ""}
                      onChange={(e) =>
                        setPasswordInputs((prev) => ({ ...prev, [doc.id]: e.target.value }))
                      }
                    />
                    <button
                      type="button"
                      disabled={actionLoading === doc.id}
                      onClick={() => void submitPassword(doc.id)}
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {actionLoading === doc.id ? "Processando…" : "Enviar senha"}
                    </button>
                  </div>
                </article>
              ))}
            </section>
          ) : null}
        </>
      ) : null}

      {!loading && mode === "review" ? (
        <section className="space-y-4">
          {history.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">Recuperação de documentos</h2>
              {history.map((d) => (
                <article key={d.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{d.fileName}</span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{d.status}</span>
                  </div>
                  {d.processingError ? (
                    <p className="mt-2 text-sm text-rose-600">{d.processingError}</p>
                  ) : null}
                  <PartiesPanel parties={d.parties} />
                  {d.status === "PASSWORD_REQUIRED" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <input
                        type="password"
                        placeholder="Senha do PDF"
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                        value={passwordInputs[d.id] ?? ""}
                        onChange={(e) =>
                          setPasswordInputs((prev) => ({ ...prev, [d.id]: e.target.value }))
                        }
                      />
                    </div>
                  ) : null}
                  <DocumentRecoveryActions doc={d} />
                </article>
              ))}
            </div>
          ) : null}
          {suggestions.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
              Nenhuma sugestão pendente de revisão.
            </p>
          ) : (
            suggestions.map((s) => {
              const lowConfidence = s.confidence < AUTO_APPROVAL_THRESHOLD || s.requiresMandatoryReview;
              const canApprove = !lowConfidence || reviewAck[s.id] === true;
              const form = editForms[s.id];
              const batch = s.batchReview;
              const isBatch = batch?.batchReviewRequired && (batch.bankStatementTransactions.length ?? 0) > 0;

              if (isBatch && batch) {
                const lineSelection = batchLineSelection[s.id] ?? Object.fromEntries(
                  batch.bankStatementTransactions.map((line) => [
                    line.id,
                    line.parseStatus === "NEEDS_REVIEW" || line.parseStatus === "ERROR"
                      ? false
                      : line.selected !== false,
                  ]),
                );
                const lineEdits = batchLineEdits[s.id] ?? {};
                const summary = batch.importSummary;
                const reviewLines = batch.bankStatementTransactions.filter(
                  (l) => l.parseStatus === "NEEDS_REVIEW" || l.parseStatus === "ERROR",
                );

                return (
                  <article key={s.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          {batch.documentKind === "BANK_STATEMENT" ? "Extrato bancário" : "Fatura de cartão"}
                          {batch.bank ? ` · ${batch.bank}` : ""}
                          {batch.profile ? ` · ${batch.profile}` : ""}
                        </p>
                        <p className="text-lg font-semibold text-slate-900">{s.fileName}</p>
                        <p className="mt-1 text-sm text-slate-600">{s.description}</p>
                        {batch.account ? (
                          <p className="mt-1 text-xs text-slate-500">Conta: {batch.account}</p>
                        ) : null}
                      </div>
                    </div>

                    {summary ? (
                      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                        <p className="font-medium text-slate-900">
                          Encontramos {summary.totalLines} lançamentos no extrato.
                        </p>
                        <p className="mt-1">
                          {summary.recognized} foram reconhecidos automaticamente.
                          {summary.needsReview > 0 ? ` ${summary.needsReview} precisam de revisão.` : ""}
                          {summary.errors > 0 ? ` ${summary.errors} com erro de leitura.` : ""}
                          {summary.ignored > 0 ? ` ${summary.ignored} linhas de cabeçalho/rodapé ignoradas.` : ""}
                        </p>
                        {summary.processedInChunks ? (
                          <p className="mt-1 text-xs text-slate-500">
                            Extrato longo — leitura feita em blocos para não perder lançamentos.
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">
                        {batch.bankStatementTransactions.length} lançamentos detectados
                      </p>
                    )}

                    {reviewLines.length > 0 ? (
                      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        Revise os lançamentos destacados em amarelo antes de confirmar a importação.
                      </p>
                    ) : null}

                    {batch.warnings && batch.warnings.length > 0 ? (
                      <ul className="mt-3 space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                        {batch.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    ) : null}

                    <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Selecionar</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Data</th>
                            <th className="px-3 py-2">Descrição</th>
                            <th className="px-3 py-2">Valor</th>
                            <th className="px-3 py-2">Tipo</th>
                            <th className="px-3 py-2">Linha original</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batch.bankStatementTransactions.map((line) => {
                            const edit = lineEdits[line.id] ?? {};
                            const displayDate = edit.date ?? line.date.slice(0, 10);
                            const displayDescription = edit.description ?? line.description;
                            const displayAmount =
                              edit.amount ?? (line.amount > 0 ? String(line.amount) : "");
                            const needsAttention =
                              line.parseStatus === "NEEDS_REVIEW" || line.parseStatus === "ERROR";

                            return (
                              <tr
                                key={line.id}
                                className={cn("border-t border-slate-100 align-top", parseStatusRowClass(line.parseStatus))}
                              >
                                <td className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    checked={lineSelection[line.id] === true}
                                    onChange={(e) =>
                                      setBatchLineSelection((prev) => ({
                                        ...prev,
                                        [s.id]: { ...lineSelection, [line.id]: e.target.checked },
                                      }))
                                    }
                                  />
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs">
                                  <span
                                    className={cn(
                                      "rounded-full px-2 py-0.5 font-medium",
                                      needsAttention
                                        ? "bg-amber-200 text-amber-900"
                                        : "bg-emerald-100 text-emerald-800",
                                    )}
                                  >
                                    {formatParseStatus(line.parseStatus)}
                                  </span>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  <input
                                    type="date"
                                    className="w-36 rounded border border-slate-200 px-2 py-1 text-xs"
                                    value={displayDate}
                                    onChange={(e) =>
                                      setBatchLineEdits((prev) => ({
                                        ...prev,
                                        [s.id]: {
                                          ...lineEdits,
                                          [line.id]: { ...edit, date: e.target.value },
                                        },
                                      }))
                                    }
                                  />
                                </td>
                                <td className="px-3 py-2 min-w-[12rem]">
                                  <input
                                    type="text"
                                    className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                                    value={displayDescription}
                                    onChange={(e) =>
                                      setBatchLineEdits((prev) => ({
                                        ...prev,
                                        [s.id]: {
                                          ...lineEdits,
                                          [line.id]: { ...edit, description: e.target.value },
                                        },
                                      }))
                                    }
                                  />
                                  {line.reviewMessage ? (
                                    <p className="mt-1 text-xs text-amber-800">{line.reviewMessage}</p>
                                  ) : null}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  <input
                                    type="text"
                                    className={cn(
                                      "w-28 rounded border px-2 py-1 text-xs",
                                      needsAttention && !displayAmount
                                        ? "border-amber-400 bg-amber-50"
                                        : "border-slate-200",
                                    )}
                                    placeholder="Informe o valor"
                                    value={displayAmount}
                                    onChange={(e) =>
                                      setBatchLineEdits((prev) => ({
                                        ...prev,
                                        [s.id]: {
                                          ...lineEdits,
                                          [line.id]: { ...edit, amount: e.target.value },
                                        },
                                      }))
                                    }
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  {line.direction === "INCOME" ? "Entrada" : "Saída"}
                                </td>
                                <td className="px-3 py-2 max-w-xs text-xs text-slate-500 whitespace-pre-wrap">
                                  {line.rawLine ?? "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {batch.installmentPurchases.length > 0 ? (
                      <div className="mt-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <p className="font-medium text-amber-900">Compras parceladas detectadas</p>
                        {batch.installmentPurchases.map((purchase) => (
                          <div key={purchase.id} className="rounded-lg border border-amber-100 bg-white p-3 text-sm">
                            <p className="font-medium text-slate-900">{purchase.merchant}</p>
                            <p className="mt-1 text-slate-600">
                              Parcela {purchase.currentInstallment}/{purchase.totalInstallments} —{" "}
                              {formatMoney(purchase.installmentAmount)}
                            </p>
                            <label className="mt-2 flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={installmentCreateChoice[s.id]?.[purchase.id] === true}
                                onChange={(e) =>
                                  setInstallmentCreateChoice((prev) => ({
                                    ...prev,
                                    [s.id]: {
                                      ...(prev[s.id] ?? {}),
                                      [purchase.id]: e.target.checked,
                                    },
                                  }))
                                }
                              />
                              Criar próximas parcelas como compromissos futuros (
                              {purchase.currentInstallment + 1}/{purchase.totalInstallments} …{" "}
                              {purchase.totalInstallments}/{purchase.totalInstallments})
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={actionLoading === s.documentId}
                        onClick={() => void confirmBatchImport(s)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Confirmar seleção
                      </button>
                      <button
                        type="button"
                        onClick={() => void rejectSuggestion(s.id)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        Rejeitar documento
                      </button>
                    </div>
                  </article>
                );
              }

              return (
                <article key={s.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Tipo identificado</p>
                      <p className="text-lg font-semibold text-slate-900">{s.method ?? "—"}</p>
                      <p className="mt-1 text-xs text-slate-500">{s.fileName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Confiança</p>
                      <p className="text-xl font-bold text-slate-900">{s.confidence}%</p>
                      {s.isLearnedPattern ? (
                        <span className="text-xs text-emerald-600">Padrão aprendido</span>
                      ) : null}
                    </div>
                  </div>

                  {lowConfidence ? (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      <p className="font-medium">⚠️ REVISÃO OBRIGATÓRIA</p>
                      <p className="mt-1">
                        Os dados extraídos possuem baixa confiança. Revise antes de aprovar.
                      </p>
                      <label className="mt-2 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={reviewAck[s.id] === true}
                          onChange={(e) =>
                            setReviewAck((prev) => ({ ...prev, [s.id]: e.target.checked }))
                          }
                        />
                        Confirmo que revisei os dados extraídos
                      </label>
                    </div>
                  ) : null}

                  <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                    {[
                      ["Valor", formatMoney(s.amount)],
                      ["Data", formatDate(s.date)],
                      ["Descrição", s.description ?? "—"],
                      ["Fornecedor", s.supplier ?? "—"],
                      ["Categoria sugerida", s.suggestedCategoryLabel ?? "—"],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-slate-500">{label}</dt>
                        <dd className="font-medium text-slate-900">{value}</dd>
                      </div>
                    ))}
                  </dl>

                  <PartiesPanel parties={s.parties} />

                  {s.confidenceReasons.length > 0 ? (
                    <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <p className="font-medium text-slate-700">Motivo da confiança</p>
                      <ul className="mt-1 list-inside list-disc text-slate-600">
                        {s.confidenceReasons.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="mt-3">
                    <button
                      type="button"
                      className="flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900"
                      onClick={() =>
                        setExpandedOcr((prev) => ({ ...prev, [s.id]: !prev[s.id] }))
                      }
                    >
                      {expandedOcr[s.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      Mostrar OCR completo
                    </button>
                    {expandedOcr[s.id] ? (
                      <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100 whitespace-pre-wrap">
                        {s.ocrText?.trim() || "Texto bruto não disponível."}
                      </pre>
                    ) : null}
                  </div>

                  {editingId === s.id && form ? (
                    <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-800">Editar sugestão</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-sm">
                          Valor
                          <input
                            type="number"
                            step="0.01"
                            className="mt-1 w-full rounded border px-2 py-1"
                            value={form.amount}
                            onChange={(e) =>
                              setEditForms((prev) => ({
                                ...prev,
                                [s.id]: { ...form, amount: e.target.value },
                              }))
                            }
                          />
                        </label>
                        <label className="text-sm">
                          Data
                          <input
                            type="date"
                            className="mt-1 w-full rounded border px-2 py-1"
                            value={form.date}
                            onChange={(e) =>
                              setEditForms((prev) => ({
                                ...prev,
                                [s.id]: { ...form, date: e.target.value },
                              }))
                            }
                          />
                        </label>
                        <label className="text-sm sm:col-span-2">
                          Descrição
                          <input
                            type="text"
                            className="mt-1 w-full rounded border px-2 py-1"
                            value={form.description}
                            onChange={(e) =>
                              setEditForms((prev) => ({
                                ...prev,
                                [s.id]: { ...form, description: e.target.value },
                              }))
                            }
                          />
                        </label>
                        <label className="text-sm sm:col-span-2">
                          Fornecedor
                          <input
                            type="text"
                            className="mt-1 w-full rounded border px-2 py-1"
                            value={form.supplier}
                            onChange={(e) =>
                              setEditForms((prev) => ({
                                ...prev,
                                [s.id]: { ...form, supplier: e.target.value },
                              }))
                            }
                          />
                        </label>
                        <label className="text-sm">
                          Categoria
                          <select
                            className="mt-1 w-full rounded border px-2 py-1"
                            value={form.categoryId}
                            onChange={(e) =>
                              setEditForms((prev) => ({
                                ...prev,
                                [s.id]: { ...form, categoryId: e.target.value, subcategoryId: "" },
                              }))
                            }
                          >
                            <option value="">—</option>
                            {rootCategories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-sm">
                          Subcategoria
                          <select
                            className="mt-1 w-full rounded border px-2 py-1"
                            value={form.subcategoryId}
                            disabled={!form.categoryId}
                            onChange={(e) =>
                              setEditForms((prev) => ({
                                ...prev,
                                [s.id]: { ...form, subcategoryId: e.target.value },
                              }))
                            }
                          >
                            <option value="">—</option>
                            {form.categoryId
                              ? subcategories(form.categoryId).map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))
                              : null}
                          </select>
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void saveEdit(s.id)}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white"
                        >
                          Salvar edição
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-lg border px-3 py-1.5 text-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!canApprove}
                      onClick={() => void approveSuggestion(s.id, lowConfidence)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Aprovar
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(s)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void reprocessDocument(s.documentId)}
                      disabled={actionLoading === s.documentId}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Reprocessar
                    </button>
                    <button
                      type="button"
                      onClick={() => void rejectSuggestion(s.id)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Rejeitar
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>
      ) : null}

      {!loading && mode === "history" ? (
        <div className="space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-slate-900">Documentos processados</h2>
            <ul className="mt-3 space-y-2">
              {history.length === 0 ? (
                <li className="text-sm text-slate-500">Nenhum documento ainda.</li>
              ) : (
                history.map((d) => (
                  <li key={d.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{d.fileName}</span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{d.status}</span>
                    </div>
                    <div className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
                      <span>Confiança: {d.confidence != null ? `${d.confidence}%` : "—"}</span>
                      <span>Sugestão: {d.suggestedCategoryLabel ?? "—"}</span>
                      <span>Final aprovada: {d.finalCategoryLabel ?? "—"}</span>
                      <span>Aprendizado: {d.learningApplied ? "Sim" : "Não"}</span>
                      <span>Pagador: {d.parties.payerName}</span>
                      <span>Recebedor: {d.parties.receiverName}</span>
                      <span>Banco (pagador): {d.parties.payerBank}</span>
                      <span>Banco (recebedor): {d.parties.receiverBank}</span>
                      <span>Documento: {d.parties.receiverDocument}</span>
                      <span>Chave PIX: {d.parties.pixKey}</span>
                      {d.processingError ? (
                        <span className="text-rose-600 sm:col-span-2">{d.processingError}</span>
                      ) : null}
                    </div>
                    <DocumentRecoveryActions doc={d} />
                  </li>
                ))
              )}
            </ul>
          </section>
          <section>
            <h2 className="text-sm font-semibold text-slate-900">Padrões aprendidos</h2>
            <ul className="mt-3 space-y-2">
              {patterns.length === 0 ? (
                <li className="text-sm text-slate-500">Nenhum padrão ainda.</li>
              ) : (
                patterns.map((p) => (
                  <li
                    key={String(p.id)}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <span>
                      {String(p.method)} · {String(p.normalizedName ?? p.pixKey ?? p.documentNumber ?? "—")} (
                      {String(p.occurrences)}x)
                    </span>
                    <button
                      type="button"
                      onClick={() => void deletePattern(String(p.id))}
                      className="text-rose-600 hover:underline"
                    >
                      Remover
                    </button>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export function ImportDashboard({ mode }: { mode: "upload" | "review" | "history" }) {
  return (
    <SettingsToastProvider>
      <ImportDashboardInner mode={mode} />
    </SettingsToastProvider>
  );
}
