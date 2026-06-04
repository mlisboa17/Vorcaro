"use client";

import { AdvisorMarkdown } from "@/components/advisor/advisor-markdown";
import { VORCARO_TONE_LABELS, type VorcaroTone } from "@/modules/vorcaro/domain/types/vorcaro-personality";
import { getVorcaroTagline } from "@/modules/vorcaro/domain/vorcaro-profile";
import type { VorcaroChatResponseDto } from "@/types/vorcaro-conversation";
import { Loader2, Send, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

type ChatMessage = {
  id: string;
  role: "USER" | "VORCARO" | "SYSTEM";
  content: string;
};

export function VorcaroChatDashboard() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vorcaroTone, setVorcaroTone] = useState<VorcaroTone>("PROFESSIONAL");
  const scrollRef = useRef<HTMLDivElement>(null);

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
  }, [messages, loading]);

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
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "USER", content: text }]);

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
      setMessages((prev) => [
        ...prev,
        { id: data.messageId, role: "VORCARO", content: data.answer },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao conversar com o Vorcaro");
    } finally {
      setLoading(false);
    }
  }

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
              Converse com o Vorcaro usando seus dados reais. Experimente: &quot;Como estou
              financeiramente?&quot; ou &quot;O que preciso resolver hoje?&quot;
            </p>
          ) : (
            <div className="space-y-4">
              {messages.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "rounded-lg p-3",
                    entry.role === "USER" ? "bg-slate-100" : "bg-emerald-50/60",
                  )}
                >
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                    {entry.role === "USER" ? "Você" : "Vorcaro"}
                  </p>
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
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte ao Vorcaro..."
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar
            </button>
          </div>
          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        </form>
      </div>
    </div>
  );
}
