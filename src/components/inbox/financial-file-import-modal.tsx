"use client";

import { fetchInstrumentList } from "@/lib/instruments/instrument-api";
import { cn } from "@/lib/utils/cn";
import type { ConfigCartao, ConfigConta } from "@/types/instruments-config";
import { Loader2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ImportConfirmRequest,
  ImportPreviewResponse,
} from "@/modules/financial-inbox/domain/schemas/financial-import-api.schema";

type ImportTipo = "EXTRATO_BANCARIO" | "FATURA_CARTAO";

interface ImportResult {
  imported: number;
  skippedDuplicates: number;
  failed: number;
}

interface FinancialFileImportModalProps {
  open: boolean;
  onClose: () => void;
  onImportSuccess: (result: ImportResult) => void;
}

const inputClassName =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".ofx") || name.endsWith(".csv") || name.endsWith(".pdf");
}

export function FinancialFileImportModal({
  open,
  onClose,
  onImportSuccess,
}: FinancialFileImportModalProps) {
  const [tipo, setTipo] = useState<ImportTipo>("EXTRATO_BANCARIO");
  const [contas, setContas] = useState<ConfigConta[]>([]);
  const [cartoes, setCartoes] = useState<ConfigCartao[]>([]);
  const [contaFinanceiraId, setContaFinanceiraId] = useState("");
  const [cartaoId, setCartaoId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"config" | "preview">("config");
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Estados para criação inline de cartão
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardFormNome, setCardFormNome] = useState("");
  const [cardFormBanco, setCardFormBanco] = useState("");
  const [cardFormBandeira, setCardFormBandeira] = useState("MASTERCARD");
  const [cardFormFinal, setCardFormFinal] = useState("");
  const [cardFormFechamento, setCardFormFechamento] = useState("5");
  const [cardFormVencimento, setCardFormVencimento] = useState("12");
  const [cardFormContaId, setCardFormContaId] = useState("");
  const [ignoredCardCreation, setIgnoredCardCreation] = useState(false);
  const [pdfPassword, setPdfPassword] = useState("");
  const [pdfRequiresPassword, setPdfRequiresPassword] = useState(false);
  const [pdfPasswordError, setPdfPasswordError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = useMemo(() => {
    if (!file) return false;
    if (tipo === "EXTRATO_BANCARIO" && !contaFinanceiraId) return false;
    return true;
  }, [file, tipo, contaFinanceiraId]);

  useEffect(() => {
    if (!open) return;

    setError(null);
    setResult(null);
    setPreview(null);
    setSkipDuplicates(true);
    setStep("config");
    setFile(null);
    setContaFinanceiraId("");
    setCartaoId("");
    setTipo("EXTRATO_BANCARIO");

    // Reiniciar estados inline de cartão
    setShowCardForm(false);
    setCardFormNome("");
    setCardFormBanco("");
    setCardFormBandeira("MASTERCARD");
    setCardFormFinal("");
    setCardFormFechamento("5");
    setCardFormVencimento("12");
    setCardFormContaId("");
    setIgnoredCardCreation(false);
    setPdfPassword("");
    setPdfRequiresPassword(false);
    setPdfPasswordError(null);

    Promise.all([
      fetchInstrumentList<ConfigConta>("/api/config/contas"),
      fetchInstrumentList<ConfigCartao>("/api/config/cartoes"),
    ])
      .then(([contasPayload, cartoesPayload]) => {
        setContas(contasPayload);
        setCartoes(cartoesPayload);
      })
      .catch((err) => {
        const message =
          err instanceof Error && err.message === "UNAUTHORIZED"
            ? "Autenticação necessária"
            : err instanceof Error
              ? err.message
              : "Falha ao carregar cadastros";
        setError(message);
      });
  }, [open]);

  async function generatePreview(passwordToSubmit?: string) {
    if (!file) return;

    if (tipo === "EXTRATO_BANCARIO" && !contaFinanceiraId) {
      setError("Selecione a conta financeira de destino.");
      return;
    }

    setLoading(true);
    setError(null);
    setPdfPasswordError(null);

    const effectivePassword = (passwordToSubmit ?? pdfPassword).trim();

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("tipo", tipo);
      if (contaFinanceiraId) {
        formData.set("contaFinanceiraId", contaFinanceiraId);
      }
      if (cartaoId) {
        formData.set("cartaoId", cartaoId);
      }
      if (effectivePassword) {
        formData.set("pdfPassword", effectivePassword);
      }

      const response = await fetch("/api/inbox/import/preview", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const body = (await response.json().catch(() => null)) as {
        error?: string;
        errorCode?: string;
        message?: string;
      } | null;

      if (!response.ok) {
        if (body?.errorCode === "PDF_PASSWORD_REQUIRED") {
          setPdfRequiresPassword(true);
          return;
        }
        if (body?.errorCode === "PDF_INVALID_PASSWORD") {
          setPdfRequiresPassword(true);
          setPdfPasswordError("Senha inválida para este PDF.");
          return;
        }
        throw new Error(body?.error ?? body?.message ?? "Falha ao processar o arquivo");
      }

      const payload = body as ImportPreviewResponse;
      setPreview(payload);
      setPdfRequiresPassword(false);

      if (tipo === "FATURA_CARTAO" && payload.detectedCard?.exists && payload.detectedCard.cardId) {
        setCartaoId(payload.detectedCard.cardId);
      } else if (tipo === "FATURA_CARTAO" && payload.detectedCard && !payload.detectedCard.exists) {
        setCardFormBanco(payload.detectedCard.bank ?? "");
        setCardFormBandeira(payload.detectedCard.brand ?? "MASTERCARD");
        setCardFormFinal(payload.detectedCard.lastFourDigits ?? "");
        setCardFormNome(payload.detectedCard.displayName ?? "Meu Novo Cartão");
      }

      setStep("preview");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro inesperado";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function confirmImport() {
    if (!preview) return;

    setLoading(true);
    setError(null);

    try {
      const requestBody: ImportConfirmRequest = {
        importType: preview.importType,
        sourceFileName: preview.sourceFileName,
        ...(contaFinanceiraId ? { contaFinanceiraId } : {}),
        ...(cartaoId ? { cartaoId } : {}),
        skipDuplicates,
        ...(ignoredCardCreation && !cartaoId ? { cardDetectionStatus: "NEEDS_MANUAL_CARD_SELECTION" } : {}),
        lines: preview.lines.map((line) => ({
          lineIndex: line.lineIndex,
          rawContent: line.rawContent,
          importHash: line.importHash,
          ...(line.externalId ? { externalId: line.externalId } : {}),
          ...(line.date ? { date: line.date } : {}),
          ...(line.description ? { description: line.description } : {}),
          ...(typeof line.amount === "number" ? { amount: line.amount } : {}),
          ...(line.installment ? { installment: line.installment } : {}),
          ...(line.totalInstallments ? { totalInstallments: line.totalInstallments } : {}),
          ...(line.suggestedCategoryId ? { suggestedCategoryId: line.suggestedCategoryId } : {}),
          ...(line.suggestedCategoryName ? { suggestedCategoryName: line.suggestedCategoryName } : {}),
          ...(line.categoryConfidence ? { categoryConfidence: line.categoryConfidence } : {}),
          ...(line.dataCompra ? { dataCompra: line.dataCompra } : {}),
          ...(line.dataCaixa ? { dataCaixa: line.dataCaixa } : {}),
          ...(line.dataVencimentoFatura ? { dataVencimentoFatura: line.dataVencimentoFatura } : {}),
        })),
      };

      const response = await fetch("/api/inbox/import/confirm", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Falha ao confirmar importação");
      }

      const payload = (await response.json()) as ImportResult;
      setResult(payload);
      onImportSuccess(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro inesperado";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCardInline() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/config/cartoes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: cardFormNome,
          contaFinanceiraId: cardFormContaId || undefined,
          nomeInstituicao: cardFormBanco || undefined,
          bandeira: cardFormBandeira,
          tipo: "CREDITO",
          ultimosQuatroDigitos: cardFormFinal || undefined,
          diaFechamento: Number(cardFormFechamento) || undefined,
          diaVencimento: Number(cardFormVencimento) || undefined,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string | { fieldErrors?: Record<string, string[]> } } | null;
        const errorMessage = typeof body?.error === "string" 
          ? body.error 
          : body?.error?.fieldErrors 
            ? Object.entries(body.error.fieldErrors).map(([k, v]) => `${k}: ${v.join(", ")}`).join("; ")
            : "Falha ao cadastrar cartão.";
        throw new Error(errorMessage);
      }

      const newCard = await response.json();
      
      // Associa o cartão criado ao modal e atualiza o preview
      setCartaoId(newCard.id);
      
      if (preview && preview.detectedCard) {
        setPreview({
          ...preview,
          detectedCard: {
            ...preview.detectedCard,
            cardId: newCard.id,
            exists: true,
            cardName: newCard.nome,
          }
        });
      }

      // Adiciona na lista local para que, se voltar para a config, o cartão apareça lá
      setCartoes((current) => [...current, {
        id: newCard.id,
        nome: newCard.nome,
        ultimosQuatroDigitos: newCard.ultimosQuatroDigitos || null,
        estaAtivo: true,
        nomeInstituicao: newCard.nomeInstituicao || null,
      } as ConfigCartao]);

      setShowCardForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado ao criar cartão.");
    } finally {
      setLoading(false);
    }
  }

  function handlePickFile(next: File | null) {
    setError(null);
    setResult(null);
    setFile(null);

    if (!next) return;

    if (!isAcceptedFile(next)) {
      setError("Formato não suportado. Use apenas .ofx, .csv ou .pdf.");
      return;
    }

    setPdfPassword("");
    setPdfRequiresPassword(false);
    setPdfPasswordError(null);
    setFile(next);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 id="import-title" className="text-lg font-semibold text-slate-900">
              Importar Extrato / Fatura
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Envie um arquivo .ofx, .csv ou .pdf para criar itens na Caixa Financeira (sem gerar
              transações automaticamente).
            </p>
          </div>
          <button
            type="button"
            onClick={() => !loading && onClose()}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Fechar"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Tipo</span>
              <select
                value={tipo}
                onChange={(event) => {
                  const next = event.target.value as ImportTipo;
                  setTipo(next);
                  setError(null);
                  setResult(null);
                  setFile(null);
                }}
                className={inputClassName}
                disabled={loading}
              >
                <option value="EXTRATO_BANCARIO">Extrato Bancário</option>
                <option value="FATURA_CARTAO">Fatura de Cartão</option>
              </select>
            </label>

            <div className="hidden sm:block" />

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Conta Financeira {tipo === "EXTRATO_BANCARIO" ? "(obrigatório)" : "(opcional)"}
              </span>
              <select
                value={contaFinanceiraId}
                onChange={(event) => setContaFinanceiraId(event.target.value)}
                className={inputClassName}
                disabled={loading}
              >
                <option value="">Selecione…</option>
                {contas.map((conta) => (
                  <option key={conta.id} value={conta.id}>
                    {conta.nome}
                    {conta.nomeInstituicao ? ` (${conta.nomeInstituicao})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Cartão {tipo === "FATURA_CARTAO" ? "(opcional)" : "(opcional)"}
              </span>
              <select
                value={cartaoId}
                onChange={(event) => setCartaoId(event.target.value)}
                className={inputClassName}
                disabled={loading}
              >
                <option value="">Selecione…</option>
                {cartoes.map((cartao) => (
                  <option key={cartao.id} value={cartao.id}>
                    {cartao.nome}
                    {cartao.ultimosQuatroDigitos ? ` · final ${cartao.ultimosQuatroDigitos}` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div
            className={cn(
              "mt-5 rounded-xl border-2 border-dashed p-5 text-center transition",
              dragOver ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-300",
              loading && "opacity-60",
            )}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              const dropped = event.dataTransfer.files?.[0] ?? null;
              handlePickFile(dropped);
            }}
            onClick={() => {
              if (!loading) {
                fileInputRef.current?.click();
              }
            }}
            role="button"
            tabIndex={0}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".ofx,.csv,.pdf"
              className="hidden"
              onChange={(event) => handlePickFile(event.target.files?.[0] ?? null)}
              disabled={loading}
            />

            {file ? (
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-900">{file.name}</p>
                <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                <p className="mt-2 text-xs text-slate-500">Clique para trocar o arquivo.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                  <Upload className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-slate-900">Arraste o arquivo ou clique aqui</p>
                <p className="text-xs text-slate-500">Suporta .ofx, .csv e .pdf</p>
              </div>
            )}
          </div>

          {pdfRequiresPassword ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">Este PDF está protegido por senha.</p>
              <p className="mt-1 text-xs text-amber-800">Informe a senha para continuar.</p>

              <div className="mt-3 max-w-sm">
                <label className="mb-1 block text-xs font-semibold text-slate-700">Senha do PDF</label>
                <input
                  type="password"
                  className={inputClassName}
                  placeholder="Digite a senha..."
                  value={pdfPassword}
                  onChange={(event) => setPdfPassword(event.target.value)}
                  disabled={loading}
                  autoComplete="off"
                />
                {pdfPasswordError ? (
                  <p className="mt-1 text-xs text-red-600">{pdfPasswordError}</p>
                ) : null}
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:underline"
                  onClick={() => {
                    setPdfRequiresPassword(false);
                    setPdfPassword("");
                    setPdfPasswordError(null);
                  }}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  onClick={() => void generatePreview(pdfPassword)}
                  disabled={loading || !pdfPassword.trim()}
                >
                  {loading ? "Processando..." : "Tentar novamente"}
                </button>
              </div>
            </div>
          ) : null}

          {step === "preview" && preview ? (
            <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-700">
                <p>
                  Arquivo: <strong>{preview.sourceFileName}</strong>
                </p>
                <p>
                  Registros: <strong>{preview.totals.total}</strong> · Novos:{" "}
                  <strong>{preview.totals.newCount}</strong> · Duplicados:{" "}
                  <strong>{preview.totals.duplicateCount}</strong>
                </p>
                {preview.detectedCard ? (
                  <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3 text-sm">
                    {preview.detectedCard.exists ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-700">
                          <div className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span>
                            Cartão detectado e associado:{" "}
                            <strong>
                              {preview.detectedCard.cardName ?? preview.detectedCard.displayName}
                            </strong>
                            {preview.detectedCard.lastFourDigits ? ` (Final ${preview.detectedCard.lastFourDigits})` : ""}
                          </span>
                        </div>
                      </div>
                    ) : cartaoId ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-700">
                          <div className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span>
                            Cartão cadastrado com sucesso e associado!
                          </span>
                        </div>
                      </div>
                    ) : ignoredCardCreation ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-700">
                          <div className="h-2 w-2 rounded-full bg-amber-500" />
                          <span>
                            Ignorado vínculo automático de cartão. O lançamento será importado sem cartão associado.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIgnoredCardCreation(false);
                            setShowCardForm(true);
                          }}
                          className="text-xs font-semibold text-slate-900 underline hover:text-slate-800"
                        >
                          Quero Cadastrar
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2 text-amber-700">
                            <div className="h-2 w-2 rounded-full bg-amber-500" />
                            <span>
                              Cartão detectado (<strong>{preview.detectedCard.displayName}</strong>), mas ainda não cadastrado.
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setShowCardForm(true);
                                setIgnoredCardCreation(false);
                              }}
                              className="rounded bg-slate-950 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800 transition"
                            >
                              Cadastrar cartão e continuar
                            </button>
                            <button
                              type="button"
                              onClick={() => setIgnoredCardCreation(true)}
                              className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                            >
                              Ignorar e continuar sem cartão
                            </button>
                          </div>
                        </div>

                        {showCardForm && (
                          <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-4 space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              Novo Cartão de Crédito
                            </h4>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="block space-y-1">
                                <span className="text-xs font-medium text-slate-600">Nome do Cartão</span>
                                <input
                                  type="text"
                                  value={cardFormNome}
                                  onChange={(e) => setCardFormNome(e.target.value)}
                                  className="w-full rounded border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-slate-400 focus:outline-none text-slate-900"
                                  placeholder="Ex: Nubank Principal"
                                  required
                                />
                              </label>

                              <label className="block space-y-1">
                                <span className="text-xs font-medium text-slate-600">Instituição / Banco</span>
                                <input
                                  type="text"
                                  value={cardFormBanco}
                                  onChange={(e) => setCardFormBanco(e.target.value)}
                                  className="w-full rounded border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-slate-400 focus:outline-none text-slate-900"
                                  placeholder="Ex: Nubank"
                                />
                              </label>

                              <label className="block space-y-1">
                                <span className="text-xs font-medium text-slate-600">Bandeira</span>
                                <select
                                  value={cardFormBandeira}
                                  onChange={(e) => setCardFormBandeira(e.target.value)}
                                  className="w-full rounded border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-slate-400 focus:outline-none text-slate-900"
                                >
                                  <option value="VISA">Visa</option>
                                  <option value="MASTERCARD">Mastercard</option>
                                  <option value="ELO">Elo</option>
                                  <option value="AMEX">Amex</option>
                                  <option value="HIPERCARD">Hipercard</option>
                                  <option value="OTHER">Outra</option>
                                </select>
                              </label>

                              <label className="block space-y-1">
                                <span className="text-xs font-medium text-slate-600">Últimos 4 Dígitos</span>
                                <input
                                  type="text"
                                  value={cardFormFinal}
                                  maxLength={4}
                                  onChange={(e) => setCardFormFinal(e.target.value.replace(/\D/g, ""))}
                                  className="w-full rounded border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-slate-400 focus:outline-none text-slate-900"
                                  placeholder="Ex: 1234"
                                />
                              </label>

                              <label className="block space-y-1">
                                <span className="text-xs font-medium text-slate-600">Dia do Fechamento (1-31)</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={31}
                                  value={cardFormFechamento}
                                  onChange={(e) => setCardFormFechamento(e.target.value)}
                                  className="w-full rounded border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-slate-400 focus:outline-none text-slate-900"
                                  required
                                />
                              </label>

                              <label className="block space-y-1">
                                <span className="text-xs font-medium text-slate-600">Dia do Vencimento (1-31)</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={31}
                                  value={cardFormVencimento}
                                  onChange={(e) => setCardFormVencimento(e.target.value)}
                                  className="w-full rounded border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-slate-400 focus:outline-none text-slate-900"
                                  required
                                />
                              </label>

                              <label className="block space-y-1 sm:col-span-2">
                                <span className="text-xs font-medium text-slate-600">Conta Vinculada (opcional)</span>
                                <select
                                  value={cardFormContaId}
                                  onChange={(e) => setCardFormContaId(e.target.value)}
                                  className="w-full rounded border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-slate-400 focus:outline-none text-slate-900"
                                >
                                  <option value="">Nenhuma conta vinculada</option>
                                  {contas.map((conta) => (
                                    <option key={conta.id} value={conta.id}>
                                      {conta.nome}
                                      {conta.nomeInstituicao ? ` (${conta.nomeInstituicao})` : ""}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                              <button
                                type="button"
                                onClick={() => setShowCardForm(false)}
                                className="rounded px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
                                disabled={loading}
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleCreateCardInline()}
                                className="inline-flex items-center gap-1.5 rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition"
                                disabled={loading || !cardFormNome}
                              >
                                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                                Salvar e Associar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(event) => setSkipDuplicates(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Ignorar duplicados automaticamente
              </label>

              <div className="max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="px-2 py-2 text-left">Data</th>
                      <th className="px-2 py-2 text-left">Descrição</th>
                      <th className="px-2 py-2 text-right">Valor</th>
                      <th className="px-2 py-2 text-center">Dup</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.previewSample.map((line) => (
                      <tr key={`${line.lineIndex}-${line.importHash}`} className="border-t border-slate-100">
                        <td className="px-2 py-1.5">{line.date ?? "—"}</td>
                        <td className="px-2 py-1.5">{line.description ?? line.rawContent.slice(0, 80)}</td>
                        <td className="px-2 py-1.5 text-right">
                          {typeof line.amount === "number" ? line.amount.toFixed(2) : "—"}
                        </td>
                        <td className="px-2 py-1.5 text-center">{line.isDuplicate ? "Sim" : "Não"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {result ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <p className="font-semibold">Arquivo importado.</p>
              <p className="mt-1">
                {result.imported} enviados para revisão · {result.skippedDuplicates} duplicados ·{" "}
                {result.failed} falhas
              </p>
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={() => !loading && onClose()}
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void (step === "config" ? generatePreview() : confirmImport())}
            disabled={
              loading ||
              (step === "config"
                ? !canSubmit
                : !preview ||
                  (tipo === "FATURA_CARTAO" &&
                    preview.detectedCard?.exists === false &&
                    !cartaoId &&
                    !ignoredCardCreation))
            }
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {step === "config" ? "Gerar Preview" : "Confirmar Importação"}
          </button>
        </div>
      </div>
    </div>
  );
}

