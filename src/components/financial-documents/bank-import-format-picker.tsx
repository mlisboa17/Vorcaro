"use client";

import {
  BANK_IMPORT_ACCEPT_BY_FORMAT,
  bankImportFormatLabel,
  detectBankImportFileFormat,
  formatPriorityHint,
  type BankImportFileFormat,
} from "@/lib/inbox/bank-import-file-types";
import { cn } from "@/lib/utils/cn";
import { FileSpreadsheet, FileText, Landmark } from "lucide-react";

export type BankImportFormatChoice = "PDF" | "OFX" | "CSV" | "EXCEL";

const FORMAT_OPTIONS: Array<{
  id: BankImportFormatChoice;
  label: string;
  description: string;
  acceptKey: Exclude<BankImportFileFormat, "UNKNOWN" | "IMAGE" | "XLS">;
  structured: boolean;
}> = [
  {
    id: "PDF",
    label: "Importar PDF",
    description: "Extrato ou fatura em PDF. Pode exigir mais revisão.",
    acceptKey: "PDF",
    structured: false,
  },
  {
    id: "OFX",
    label: "Importar OFX",
    description: "Formato do banco com boa precisão.",
    acceptKey: "OFX",
    structured: true,
  },
  {
    id: "CSV",
    label: "Importar CSV",
    description: "Planilha exportada pelo banco.",
    acceptKey: "CSV",
    structured: true,
  },
  {
    id: "EXCEL",
    label: "Importar Excel",
    description: "Arquivos .xls ou .xlsx.",
    acceptKey: "XLSX",
    structured: true,
  },
];

type Props = {
  selected: BankImportFormatChoice | null;
  onSelect: (format: BankImportFormatChoice) => void;
  className?: string;
};

export function BankImportFormatPicker({ selected, onSelect, className }: Props) {
  return (
    <div className={className}>
      <p className="text-sm text-slate-600">
        OFX, CSV e Excel costumam ter <strong>melhor reconhecimento</strong> que PDF, pois trazem
        dados estruturados. Se o banco permitir, prefira esses formatos.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {FORMAT_OPTIONS.map((option) => {
          const active = selected === option.id;
          const Icon = option.id === "PDF" ? FileText : option.structured ? FileSpreadsheet : Landmark;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className={cn(
                "rounded-xl border p-4 text-left transition",
                active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50",
              )}
            >
              <div className="flex items-start gap-3">
                <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", active ? "text-white" : "text-slate-500")} />
                <div>
                  <p className="font-medium">{option.label}</p>
                  <p className={cn("mt-1 text-xs", active ? "text-slate-200" : "text-slate-500")}>
                    {option.description}
                  </p>
                  {option.structured ? (
                    <span
                      className={cn(
                        "mt-2 inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        active ? "bg-white/15 text-white" : "bg-emerald-50 text-emerald-800",
                      )}
                    >
                      Reconhecimento preferido
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function acceptForBankImportFormat(format: BankImportFormatChoice): string {
  if (format === "EXCEL") {
    return `${BANK_IMPORT_ACCEPT_BY_FORMAT.XLS},${BANK_IMPORT_ACCEPT_BY_FORMAT.XLSX}`;
  }
  return BANK_IMPORT_ACCEPT_BY_FORMAT[format];
}

export function isStructuredImportFormat(format: BankImportFormatChoice): boolean {
  return format === "OFX" || format === "CSV" || format === "EXCEL";
}

export function formatHintForFileName(fileName: string): string | null {
  return formatPriorityHint(detectBankImportFileFormat(fileName));
}

export function labelForFileName(fileName: string): string {
  return bankImportFormatLabel(detectBankImportFileFormat(fileName));
}
