"use client";

import { Loader2, SendHorizonal } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

interface QuickIngestInputProps {
  onSubmitted: () => void;
  className?: string;
}

export function QuickIngestInput({ onSubmitted, className }: QuickIngestInputProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const rawContent = text.trim();
    if (!rawContent) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rawContent }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Falha ao enviar item");
      }

      setText("");
      onSubmitted();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-4 shadow-sm",
        className,
      )}
    >
      <label htmlFor="quick-ingest" className="mb-2 block text-sm font-medium text-slate-700">
        Entrada rápida
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="quick-ingest"
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="O que você gastou ou recebeu agora?"
          className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none ring-blue-500 transition focus:ring-2"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SendHorizonal className="h-4 w-4" />
          )}
          Enviar para a Caixa
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}
