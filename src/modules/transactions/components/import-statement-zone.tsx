"use client";

import React, { useState, useTransition, useRef } from "react";
import { UploadCloud, CheckCircle2, AlertCircle, FileText, Loader2, ChevronDown } from "lucide-react";
import { importStatementAction } from "@/modules/transactions/actions/import-statement";

type Account = {
  id: string;
  name: string;
  type: string;
};

type ImportStatementZoneProps = {
  accounts: Account[];
};

export function ImportStatementZone({ accounts }: ImportStatementZoneProps) {
  const [accountId, setAccountId] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndUpload = (file: File) => {
    setError(null);
    setSuccessMsg(null);

    // Validações no cliente
    if (file.size > 5 * 1024 * 1024) {
      setError("O arquivo excede o limite máximo de 5MB.");
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "ofx" && ext !== "csv") {
      setError("Formato inválido. Por favor, envie apenas arquivos .ofx ou .csv.");
      return;
    }

    if (!accountId) {
      setError("Selecione uma conta bancária de destino antes de importar.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("accountId", accountId);

    startTransition(async () => {
      try {
        const result = await importStatementAction(formData);
        if (result.success) {
          setSuccessMsg(result.message || "Importação concluída com sucesso.");
        } else {
          setError(result.error || "Falha ao processar o arquivo.");
        }
      } catch (err: any) {
        setError("Ocorreu um erro inesperado de rede ou no servidor.");
      }
    });
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!accountId) return; // Só permite drag visual se a conta estiver selecionada
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (!accountId) {
      setError("Selecione uma conta bancária de destino antes de importar.");
      return;
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndUpload(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndUpload(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    if (!accountId) {
      setError("Selecione uma conta bancária de destino antes de importar.");
      return;
    }
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      
      {/* Header Contexto */}
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          Importar Extrato
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400">
          Arraste e solte o seu arquivo OFX ou CSV do seu banco. Nós categorizaremos automaticamente.
        </p>
      </div>

      {/* Conta Destino Select */}
      <div className="space-y-3">
        <label htmlFor="account-select" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Conta de Destino
        </label>
        <div className="relative">
          <select
            id="account-select"
            value={accountId}
            onChange={(e) => {
              setAccountId(e.target.value);
              setError(null);
            }}
            disabled={isPending}
            className="w-full appearance-none rounded-xl border border-neutral-200 bg-white/50 px-4 py-3 pr-10 text-neutral-900 shadow-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20 disabled:opacity-50"
          >
            <option value="" disabled>
              -- Selecione a Conta Bancária --
            </option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.type})
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-5 w-5 text-neutral-400" />
        </div>
      </div>

      {/* Dropzone Area */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={triggerFileInput}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-all duration-300 ease-in-out ${
          !accountId
            ? "cursor-not-allowed border-neutral-200 bg-neutral-50/50 opacity-60 dark:border-neutral-800 dark:bg-neutral-900/20"
            : isPending
            ? "cursor-wait border-indigo-200 bg-indigo-50/30 dark:border-indigo-900/50 dark:bg-indigo-900/10"
            : isDragging
            ? "scale-[1.02] border-indigo-500 bg-indigo-50/50 shadow-lg shadow-indigo-500/10 dark:border-indigo-400 dark:bg-indigo-500/10"
            : "border-neutral-300 bg-white hover:border-indigo-400 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 hover:dark:border-indigo-500 hover:dark:bg-neutral-800/50"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".ofx,.csv"
          className="hidden"
          disabled={!accountId || isPending}
        />

        <div className="flex flex-col items-center gap-4 text-center">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full transition-colors duration-300 ${
              isPending
                ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400"
                : isDragging
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
            }`}
          >
            {isPending ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : isDragging ? (
              <FileText className="h-8 w-8" />
            ) : (
              <UploadCloud className="h-8 w-8" />
            )}
          </div>

          <div>
            {isPending ? (
              <p className="text-lg font-medium text-indigo-600 dark:text-indigo-400">
                Processando arquivo...
              </p>
            ) : (
              <>
                <p className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
                  {isDragging
                    ? "Solte o arquivo aqui!"
                    : "Clique ou arraste o arquivo aqui"}
                </p>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  Apenas arquivos <span className="font-semibold text-neutral-700 dark:text-neutral-300">.ofx</span> e <span className="font-semibold text-neutral-700 dark:text-neutral-300">.csv</span> (máx. 5MB)
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Feedbacks de Sucesso ou Erro */}
      <div className="transition-all duration-300">
        {error && (
          <div className="flex animate-in fade-in slide-in-from-top-2 items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {successMsg && !error && (
          <div className="flex animate-in fade-in slide-in-from-top-2 items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{successMsg}</p>
          </div>
        )}
      </div>
    </div>
  );
}
