"use client";

import {
  acceptForBankImportFormat,
  BankImportFormatPicker,
  formatHintForFileName,
  labelForFileName,
  type BankImportFormatChoice,
} from "@/components/financial-documents/bank-import-format-picker";
import { BANK_IMPORT_ACCEPT_INBOX } from "@/lib/inbox/bank-import-file-types";
import { cn } from "@/lib/utils/cn";
import type {
  ImportPreviewLine,
  ImportPreviewResponse,
} from "@/modules/financial-inbox/domain/schemas/financial-import-api.schema";
import { Upload } from "lucide-react";
import { useRef, useState } from "react";

type Props = {
  onOpenFullImport?: () => void;
  className?: string;
};

function isAcceptedInboxFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".pdf") ||
    name.endsWith(".ofx") ||
    name.endsWith(".csv") ||
    name.endsWith(".xls") ||
    name.endsWith(".xlsx")
  );
}

export function InboxBankImportPanel({ onOpenFullImport, className }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFormat, setSelectedFormat] = useState<BankImportFormatChoice | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  function handlePick(next: File | null) {
    if (!next) return;
    if (!isAcceptedInboxFile(next)) {
      return;
    }
    setFile(next);
    onOpenFullImport?.();
  }

  function openPicker(format?: BankImportFormatChoice) {
    if (format) setSelectedFormat(format);
    fileInputRef.current?.click();
  }

  const accept = selectedFormat ? acceptForBankImportFormat(selectedFormat) : BANK_IMPORT_ACCEPT_INBOX;
  const hint = file ? formatHintForFileName(file.name) : null;

  return (
    <section
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-5 shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Central de arquivos</h2>
          <p className="mt-1 text-sm text-slate-500">
            Envie extratos bancários ou faturas. Detectamos o formato automaticamente e mostramos
            uma prévia antes de gravar na caixa.
          </p>
        </div>
        {onOpenFullImport ? (
          <button
            type="button"
            onClick={onOpenFullImport}
            className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Abrir importação completa
          </button>
        ) : null}
      </div>

      <div className="mt-4">
        <BankImportFormatPicker selected={selectedFormat} onSelect={(f) => openPicker(f)} />
      </div>

      <div
        className={cn(
          "mt-4 rounded-xl border-2 border-dashed p-6 text-center transition",
          dragOver ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-300",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handlePick(e.dataTransfer.files?.[0] ?? null);
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            handlePick(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />

        {file ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-900">{file.name}</p>
            <p className="text-xs text-slate-500">Formato detectado: {labelForFileName(file.name)}</p>
            {hint ? <p className="text-xs text-slate-600">{hint}</p> : null}
            <p className="mt-2 text-xs text-slate-500">
              Use &quot;Abrir importação completa&quot; para revisar e confirmar os lançamentos.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="mx-auto h-8 w-8 text-slate-400" />
            <p className="text-sm text-slate-600">Arraste um arquivo ou escolha o formato acima.</p>
            <button
              type="button"
              onClick={() => openPicker(selectedFormat ?? undefined)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Selecionar arquivo
            </button>
            <p className="text-xs text-slate-500">PDF, OFX, CSV, XLS e XLSX</p>
          </div>
        )}
      </div>
    </section>
  );
}

export type { ImportPreviewResponse, ImportPreviewLine };
