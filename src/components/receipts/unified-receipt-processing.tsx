"use client";

import React, { useState, useTransition } from "react";
import { 
  FileUp, Loader2, Check, X, AlertCircle, ZoomIn, ZoomOut, RotateCcw, ChevronDown, ChevronRight, FileText, CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface DocumentSuggestion {
  id: string;
  amount: number | null;
  date: string | null;
  description: string | null;
  supplier: string | null;
  method: string | null;
  categoryId: string | null;
  confidence: number;
}

export interface ReceiptDocument {
  id: string;
  fileName: string;
  mimeType: string;
  status: string;
  createdAt: Date;
  extractedJson: any; // Contains base64 of file
  suggestions: DocumentSuggestion[];
}

export interface CategoryOption {
  id: string;
  name: string;
}

export interface AccountOption {
  id: string;
  name: string;
}

interface UnifiedReceiptProcessingProps {
  initialDocuments: ReceiptDocument[];
  categories: CategoryOption[];
  accounts: AccountOption[];
}

export function UnifiedReceiptProcessing({
  initialDocuments,
  categories,
  accounts,
}: UnifiedReceiptProcessingProps) {
  const [documents, setDocuments] = useState<ReceiptDocument[]>(initialDocuments);
  
  // Filter active (pending review) vs historical documents
  const activeDocs = documents.filter((d) => 
    ["UPLOADED", "PROCESSING", "EXTRACTED", "REVIEW_REQUIRED", "PASSWORD_REQUIRED"].includes(d.status)
  );
  const historyDocs = documents.filter((d) => 
    ["APPROVED", "REJECTED", "FAILED"].includes(d.status)
  );

  const [selectedDoc, setSelectedDoc] = useState<ReceiptDocument | null>(activeDocs[0] || null);

  // Form states (exhibited on the right form espelho)
  const currentSuggestion = selectedDoc?.suggestions?.[0] || null;
  const [supplier, setSupplier] = useState(currentSuggestion?.supplier || "");
  const [cnpjCpf, setCnpjCpf] = useState("");
  const [amount, setAmount] = useState<string>(currentSuggestion?.amount ? String(currentSuggestion.amount) : "");
  const [date, setDate] = useState<string>(currentSuggestion?.date ? new Date(currentSuggestion.date).toISOString().slice(0, 10) : "");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(currentSuggestion?.categoryId || "");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  // Zoom controls state
  const [zoom, setZoom] = useState<number>(100);

  // Transitions & states
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Update form inputs when selected document changes
  React.useEffect(() => {
    if (selectedDoc) {
      const sugg = selectedDoc.suggestions?.[0] || null;
      setSupplier(sugg?.supplier || selectedDoc.fileName.split(".")[0] || "");
      setAmount(sugg?.amount ? String(sugg.amount) : "");
      setDate(sugg?.date ? new Date(sugg.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
      setSelectedCategoryId(sugg?.categoryId || "");
      
      // Attempt to read CNPJ from doc JSON if present
      const extracted = selectedDoc.extractedJson as any;
      if (extracted?.parties?.receiverDocument) {
        setCnpjCpf(extracted.parties.receiverDocument);
      } else if (extracted?.extractedFields?.cpfCnpj) {
        setCnpjCpf(extracted.extractedFields.cpfCnpj);
      } else {
        setCnpjCpf("");
      }
    } else {
      setSupplier("");
      setCnpjCpf("");
      setAmount("");
      setDate("");
      setSelectedCategoryId("");
    }
  }, [selectedDoc]);

  // Upload new file (batch capture)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/import/documents", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Erro ao enviar comprovante.");
        }
      }
      setSuccessMsg("Comprovantes carregados com sucesso para triagem!");
      window.location.reload();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao fazer upload dos arquivos.");
    } finally {
      setUploading(false);
    }
  };

  // Get base64 Data URL for viewer
  const getDocumentDataUrl = () => {
    if (!selectedDoc) return null;
    const extracted = selectedDoc.extractedJson as any;
    const base64 = extracted?._storage?.base64;
    if (!base64) return null;
    return `data:${selectedDoc.mimeType};base64,${base64}`;
  };

  // Liquidar Transação (Approve / Save Suggestion)
  const handleLiquidar = async () => {
    if (!selectedDoc || !currentSuggestion) return;
    if (!selectedAccountId) {
      setErrorMsg("Selecione a Conta Financeira para liquidar a transação.");
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        // 1. Save any edits to the suggestion first
        const patchRes = await fetch(`/api/import/suggestions/${currentSuggestion.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: amount ? Number(amount) : undefined,
            date: date || undefined,
            supplier: supplier || undefined,
            categoryId: selectedCategoryId || undefined,
          }),
        });

        if (!patchRes.ok) {
          const errData = await patchRes.json().catch(() => ({}));
          throw new Error(errData.error ?? "Falha ao salvar edições do comprovante.");
        }

        // 2. Approve/liquidate suggestion
        const approveRes = await fetch(`/api/import/suggestions/${currentSuggestion.id}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: selectedAccountId,
            acknowledgedLowConfidence: true,
          }),
        });

        if (!approveRes.ok) {
          const errData = await approveRes.json().catch(() => ({}));
          throw new Error(errData.code === "LOW_CONFIDENCE_REVIEW_REQUIRED" 
            ? "Confirmação pendente por baixa confiança do OCR."
            : (errData.error ?? "Falha ao liquidar transação."));
        }

        setSuccessMsg(`Transação para "${supplier}" liquidada com sucesso!`);
        
        // Remove from list or refresh status
        const nextDocs = documents.map((doc) => {
          if (doc.id === selectedDoc.id) {
            return { ...doc, status: "APPROVED" };
          }
          return doc;
        });
        setDocuments(nextDocs);
        
        const nextActive = nextDocs.filter((d) => 
          ["UPLOADED", "PROCESSING", "EXTRACTED", "REVIEW_REQUIRED", "PASSWORD_REQUIRED"].includes(d.status)
        );
        setSelectedDoc(nextActive[0] || null);

      } catch (err: any) {
        setErrorMsg(err.message || "Erro desconhecido ao processar comprovante.");
      }
    });
  };

  // Reject document
  const handleRejectDoc = async (docId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/import/documents/${docId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "REJECTED" }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error ?? "Falha ao rejeitar comprovante.");
        }

        setSuccessMsg("Comprovante rejeitado.");
        
        const nextDocs = documents.map((doc) => {
          if (doc.id === docId) {
            return { ...doc, status: "REJECTED" };
          }
          return doc;
        });
        setDocuments(nextDocs);

        const nextActive = nextDocs.filter((d) => 
          ["UPLOADED", "PROCESSING", "EXTRACTED", "REVIEW_REQUIRED", "PASSWORD_REQUIRED"].includes(d.status)
        );
        setSelectedDoc(nextActive[0] || null);

      } catch (err: any) {
        setErrorMsg(err.message || "Erro ao rejeitar comprovante.");
      }
    });
  };

  const fileUrl = getDocumentDataUrl();

  return (
    <div className="space-y-4 text-slate-800">
      {/* Toast notifications */}
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

      {/* Top action area / Upload input */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded shadow-sm">
        <span className="text-xs font-semibold text-slate-600">
          Fila de Triagem de Comprovantes
        </span>
        <div className="flex items-center gap-2">
          <input
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            id="batch-upload"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
          <label
            htmlFor="batch-upload"
            className="cursor-pointer inline-flex items-center gap-1.5 rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold shadow-sm transition-all"
          >
            {uploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Carregando...
              </>
            ) : (
              <>
                <FileUp className="h-3.5 w-3.5" />
                Carregar Comprovantes
              </>
            )}
          </label>
        </div>
      </div>

      {/* Triagem Grid Layout */}
      <div className="grid gap-3 md:grid-cols-12">
        {/* LEFT COLUMN: Worklist Queue */}
        <div className="rounded border border-slate-200 bg-white shadow-sm md:col-span-3 flex flex-col overflow-hidden max-h-[500px]">
          <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Worklist Queue ({activeDocs.length})
            </span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto">
            {activeDocs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs px-2">
                Nenhum comprovante pendente. Faça upload acima.
              </div>
            ) : (
              activeDocs.map((doc) => {
                const isSelected = selectedDoc?.id === doc.id;
                
                // Map status label & styles
                let statusLabel = "Processando OCR";
                let badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";

                if (doc.status === "EXTRACTED" || doc.status === "REVIEW_REQUIRED") {
                  statusLabel = "Pronto";
                  badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
                } else if (doc.status === "FAILED") {
                  statusLabel = "Erro";
                  badgeStyle = "bg-red-50 text-red-700 border-red-200";
                }

                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className={cn(
                      "p-2.5 cursor-pointer hover:bg-slate-50 transition-colors space-y-1.5",
                      isSelected ? "bg-slate-100 font-medium border-l-2 border-slate-800" : ""
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="text-[11px] font-semibold text-slate-800 truncate block w-full">
                        {doc.fileName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-mono">
                        {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                      <span className={cn("px-1.5 py-0.5 rounded-sm border text-[9px] font-bold uppercase shrink-0", badgeStyle)}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CENTER PANEL: Middle Canvas (Document Viewer) */}
        <div className="rounded border border-slate-200 bg-slate-100 shadow-sm md:col-span-6 flex flex-col overflow-hidden min-h-[400px] max-h-[500px]">
          {/* Zoom & Control Bar */}
          <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Painel Central (Visualizador)
            </span>
            {fileUrl && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoom(Math.max(50, zoom - 25))}
                  className="p-1 rounded bg-white hover:bg-slate-200 text-slate-600 border border-slate-300"
                  title="Diminuir Zoom"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="text-[10px] font-mono text-slate-500">{zoom}%</span>
                <button
                  type="button"
                  onClick={() => setZoom(Math.min(200, zoom + 25))}
                  className="p-1 rounded bg-white hover:bg-slate-200 text-slate-600 border border-slate-300"
                  title="Aumentar Zoom"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(100)}
                  className="p-1 rounded bg-white hover:bg-slate-200 text-slate-600 border border-slate-300"
                  title="Resetar Zoom"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Document Canvas Content */}
          <div className="flex-1 flex items-center justify-center p-3 overflow-auto relative">
            {fileUrl ? (
              selectedDoc?.mimeType === "application/pdf" ? (
                <iframe
                  src={fileUrl}
                  style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center center" }}
                  className="w-full h-full border-0 transition-transform duration-200"
                />
              ) : (
                <img
                  src={fileUrl}
                  alt={selectedDoc?.fileName}
                  style={{ transform: `scale(${zoom / 100})` }}
                  className="max-w-full max-h-full object-contain shadow transition-transform duration-200"
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                <FileText className="h-12 w-12 text-slate-300 mb-2" />
                <p className="text-xs">Selecione ou envie um comprovante para visualizar.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Formulário Espelho */}
        <div className="rounded border border-slate-200 bg-white shadow-sm md:col-span-3 flex flex-col max-h-[500px]">
          <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Formulário Espelho (OCR)
            </span>
          </div>

          <div className="p-3 space-y-3 flex-1 flex flex-col justify-between overflow-y-auto">
            {selectedDoc ? (
              <div className="space-y-2.5">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                    Favorecido / Emissor
                  </label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs outline-none focus:border-slate-500 font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                    CNPJ / CPF
                  </label>
                  <input
                    type="text"
                    value={cnpjCpf}
                    onChange={(e) => setCnpjCpf(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs outline-none focus:border-slate-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                      Valor (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1 text-xs outline-none focus:border-slate-500 font-bold text-slate-800 text-right"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                      Data
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1 text-xs outline-none focus:border-slate-500 font-mono text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                    Plano de Contas (Categoria)
                  </label>
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-slate-500"
                  >
                    <option value="">Selecione uma categoria...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                    Conta Financeira de Débito
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-slate-500"
                  >
                    <option value="">Selecione a conta...</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                <HelpCircleIcon className="h-8 w-8 text-slate-300 mb-1" />
                <p className="text-xs">Nenhum comprovante selecionado.</p>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={handleLiquidar}
                disabled={!selectedDoc || isPending}
                className="w-full inline-flex justify-center items-center gap-1.5 rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 px-3 py-2 text-xs font-semibold shadow-sm transition-all focus:ring-2 focus:ring-slate-950"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5" />
                )}
                [Liquidar Transação]
              </button>
              {selectedDoc && (
                <button
                  type="button"
                  onClick={() => handleRejectDoc(selectedDoc.id)}
                  disabled={isPending}
                  className="w-full inline-flex justify-center items-center gap-1.5 rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 text-xs font-medium transition-all"
                >
                  Rejeitar Comprovante
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* HISTÓRICO: Abas colapsáveis (Accordion) */}
      <div className="rounded border border-slate-200 bg-white shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          className="w-full flex items-center justify-between bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 hover:bg-slate-100 transition-colors"
        >
          <span>Histórico de Triagem de Comprovantes</span>
          {isHistoryOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {isHistoryOpen && (
          <div className="p-2 overflow-x-auto">
            <table className="w-full border-collapse text-left text-[11px] font-sans">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-500 uppercase">
                  <th className="px-2 py-1.5">Data de Upload</th>
                  <th className="px-2 py-1.5">Nome do Arquivo</th>
                  <th className="px-2 py-1.5 text-center">Tipo</th>
                  <th className="px-2 py-1.5 text-center">Status final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyDocs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400 font-medium">
                      Nenhum comprovante processado anteriormente.
                    </td>
                  </tr>
                ) : (
                  historyDocs.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-2 py-1.5 font-mono text-slate-500">
                        {new Date(item.createdAt).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-2 py-1.5 font-semibold text-slate-800">{item.fileName}</td>
                      <td className="px-2 py-1.5 text-center font-mono text-slate-500">{item.mimeType}</td>
                      <td className="px-2 py-1.5 text-center">
                        <span className={cn(
                          "inline-block rounded px-1.5 py-0.5 text-[9px] font-bold border uppercase",
                          item.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : item.status === "REJECTED"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        )}>
                          {item.status === "APPROVED" ? "Liquidado" : item.status}
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

function HelpCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
