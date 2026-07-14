"use client";

import { AdvisorMarkdown } from "@/components/advisor/advisor-markdown";
import { VORCARO_TONE_LABELS, type VorcaroTone } from "@/modules/vorcaro/domain/types/vorcaro-personality";
import { getVorcaroTagline } from "@/modules/vorcaro/domain/vorcaro-profile";
import type { VorcaroChatResponseDto } from "@/types/vorcaro-conversation";
import { Loader2, Mic, Paperclip, Send, Sparkles, Square, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

type ChatMessage = {
  id: string;
  role: "USER" | "VORCARO" | "SYSTEM";
  content: string;
};

const MAX_POLL_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 2000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function VorcaroChatDashboard() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vorcaroTone, setVorcaroTone] = useState<VorcaroTone>("PROFESSIONAL");
  const [isRecording, setIsRecording] = useState(false);
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const loadPreferences = useCallback(async () => {
    const res = await fetch("/api/vorcaro/preferences");
    if (res.ok) {
      const data = (await res.json()) as { vorcaroTone: VorcaroTone };
      setVorcaroTone(data.vorcaroTone);
    }
  }, []);

  const loadLatestConversation = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const listRes = await fetch("/api/vorcaro/conversations");
      if (!listRes.ok) return;
      const list = (await listRes.json()) as { items: Array<{ id: string }> };
      const latest = list.items[0];
      if (!latest) return;

      setConversationId(latest.id);
      const detailRes = await fetch(`/api/vorcaro/conversations/${latest.id}`);
      if (!detailRes.ok) return;
      const detail = (await detailRes.json()) as { messages: ChatMessage[] };
      setMessages(detail.messages);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    void loadPreferences();
    void loadLatestConversation();
  }, [loadPreferences, loadLatestConversation]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, attachmentBusy]);

  function pushMessage(role: ChatMessage["role"], content: string) {
    setMessages((prev) => [...prev, { id: `${role.toLowerCase()}-${Date.now()}-${Math.random()}`, content, role }]);
  }

  async function handleToneChange(next: VorcaroTone) {
    const res = await fetch("/api/vorcaro/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vorcaroTone: next }),
    });
    if (res.ok) {
      const data = (await res.json()) as { vorcaroTone: VorcaroTone };
      setVorcaroTone(data.vorcaroTone);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setError(null);
    setLoading(true);
    setInput("");
    pushMessage("USER", text);

    try {
      const res = await fetch("/api/vorcaro/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId: conversationId ?? undefined }),
      });

      if (res.status === 429) {
        throw new Error("Limite de mensagens atingido. Tente novamente em alguns minutos.");
      }
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Falha ao enviar mensagem");
      }

      const data = (await res.json()) as VorcaroChatResponseDto;
      setConversationId(data.conversationId);
      pushMessage("VORCARO", data.answer);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao conversar com o Vorcaro");
    } finally {
      setLoading(false);
    }
  }

  async function pollInboxItem(id: string): Promise<{ status: string; summary: string } | null> {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      await sleep(POLL_INTERVAL_MS);
      const res = await fetch(`/api/inbox/${id}`);
      if (!res.ok) continue;
      const data = (await res.json()) as {
        item: { status: string; rawContent: string };
        extractionResult: { extractedData?: Record<string, unknown> } | null;
      };
      if (data.item.status === "PENDING" || data.item.status === "PROCESSING") {
        continue;
      }
      const extracted = data.extractionResult?.extractedData as
        | { description?: string; amount?: number; type?: string }
        | undefined;
      if (data.item.status === "ERROR") {
        return { status: data.item.status, summary: "Não consegui extrair informações desse envio." };
      }
      if (extracted?.amount != null) {
        const valueStr = Math.abs(extracted.amount).toFixed(2).replace(".", ",");
        const typeStr = extracted.type === "INCOME" ? "Receita" : "Despesa";
        return {
          status: data.item.status,
          summary: `📝 **${extracted.description ?? "Lançamento"}**\nValor: R$ ${valueStr} (${typeStr})\n\nConfira e confirme em Caixa Financeira.`,
        };
      }
      return { status: data.item.status, summary: "Recebido! Confira os detalhes em Caixa Financeira." };
    }
    return null;
  }

  async function uploadImageOrVoice(file: Blob, contentType: "IMAGE" | "VOICE", label: string, fileName: string) {
    setAttachmentBusy(true);
    setError(null);
    pushMessage("USER", label);
    pushMessage("SYSTEM", "⏳ Processando com Inteligência Artificial...");

    try {
      const formData = new FormData();
      formData.append("file", file, fileName);
      formData.append("contentType", contentType);

      const res = await fetch("/api/inbox", { method: "POST", body: formData });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Falha ao enviar arquivo");
      }
      const created = (await res.json()) as { id: string };

      const result = await pollInboxItem(created.id);
      pushMessage("VORCARO", result?.summary ?? "Recebido! O processamento pode levar mais alguns instantes — confira em Caixa Financeira.");
    } catch (e) {
      pushMessage("VORCARO", e instanceof Error ? e.message : "Erro ao processar o envio.");
    } finally {
      setAttachmentBusy(false);
    }
  }

  async function uploadDocument(file: File) {
    setAttachmentBusy(true);
    setError(null);
    pushMessage("USER", `📄 ${file.name}`);
    pushMessage("SYSTEM", "⏳ Analisando documento...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import/documents", { method: "POST", body: formData });
      const body = (await res.json().catch(() => ({}))) as {
        processing?: { status?: string; message?: string; reason?: string };
        error?: string;
      };

      if (!res.ok) {
        throw new Error(body.error ?? body.processing?.reason ?? "Falha ao processar documento");
      }

      const status = body.processing?.status;
      const summary =
        status === "REVIEW_REQUIRED"
          ? "📄 Documento analisado! Encontrei lançamentos para revisar — confira em Caixa Financeira ou Importar Extrato/Fatura."
          : status === "PASSWORD_REQUIRED"
            ? "🔒 Este PDF está protegido por senha. Envie pelo Dashboard → Importar Extrato/Fatura para informar a senha."
            : (body.processing?.message ?? body.processing?.reason ?? "Documento recebido e processado.");

      pushMessage("VORCARO", summary);
    } catch (e) {
      pushMessage("VORCARO", e instanceof Error ? e.message : "Erro ao processar o documento.");
    } finally {
      setAttachmentBusy(false);
    }
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".ofx") || file.name.toLowerCase().endsWith(".csv")) {
      await uploadDocument(file);
      return;
    }

    if (file.type.startsWith("image/")) {
      await uploadImageOrVoice(file, "IMAGE", `📷 ${file.name}`, file.name);
      return;
    }

    setError("Tipo de arquivo não suportado. Envie uma foto, PDF, OFX ou CSV.");
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        void uploadImageOrVoice(blob, "VOICE", "🎤 Áudio enviado", "gravacao.webm");
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      setError("Não foi possível acessar o microfone. Verifique as permissões do navegador.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }

  const busy = loading || attachmentBusy || isRecording;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Sparkles className="h-5 w-5 text-violet-600" />
              Vorcaro
            </h2>
            <p className="mt-1 text-xs italic text-slate-500">{getVorcaroTagline()}</p>
          </div>
          <label className="text-xs text-slate-500">
            Tom
            <select
              value={vorcaroTone}
              onChange={(e) => void handleToneChange(e.target.value as VorcaroTone)}
              className="mt-1 block rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
            >
              {(Object.keys(VORCARO_TONE_LABELS) as VorcaroTone[]).map((tone) => (
                <option key={tone} value={tone}>
                  {VORCARO_TONE_LABELS[tone]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div ref={scrollRef} className="max-h-[520px] min-h-[360px] overflow-y-auto p-4">
          {loadingHistory ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-sm text-slate-500">
              Converse com o Vorcaro, envie uma despesa por texto (ex.: &quot;Mercado 50,00&quot;), anexe uma
              foto de comprovante ou fatura, ou grave um áudio.
            </p>
          ) : (
            <div className="space-y-4">
              {messages.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "rounded-lg p-3",
                    entry.role === "USER"
                      ? "bg-slate-100"
                      : entry.role === "SYSTEM"
                        ? "bg-slate-50 text-slate-500 italic"
                        : "bg-emerald-50/60",
                  )}
                >
                  {entry.role !== "SYSTEM" && (
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                      {entry.role === "USER" ? "Você" : "Vorcaro"}
                    </p>
                  )}
                  {entry.role === "VORCARO" ? (
                    <AdvisorMarkdown text={entry.content} />
                  ) : (
                    <p className="text-sm text-slate-800">{entry.content}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,.ofx,.csv"
              className="hidden"
              onChange={(e) => void handleFileSelected(e)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              title="Anexar foto, PDF, OFX ou CSV"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => (isRecording ? stopRecording() : void startRecording())}
              disabled={loading || attachmentBusy}
              title={isRecording ? "Parar gravação" : "Gravar áudio"}
              className={cn(
                "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition",
                isRecording
                  ? "border-red-300 bg-red-50 text-red-600 animate-pulse"
                  : "border-slate-200 text-slate-500 hover:bg-slate-50",
                (loading || attachmentBusy) && "opacity-50",
              )}
            >
              {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isRecording ? "Gravando áudio..." : "Pergunte ou envie uma despesa..."}
              disabled={isRecording}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-50"
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          {isRecording ? (
            <p className="mt-2 flex items-center gap-1 text-xs text-red-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              Gravando... toque no quadrado para enviar
            </p>
          ) : null}
          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        </form>
      </div>
    </div>
  );
}
