"use client";

import { Camera, Loader2, Mic, MicOff, Paperclip, SendHorizontal, Square } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

interface QuickIngestProps {
  onSubmitted: () => void;
  className?: string;
}

async function submitJsonPayload(body: Record<string, unknown>) {
  const response = await fetch("/api/inbox", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(typeof payload.error === "string" ? payload.error : "Falha ao enviar item");
  }
}

async function submitMultipart(formData: FormData) {
  const response = await fetch("/api/inbox", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(typeof payload.error === "string" ? payload.error : "Falha ao enviar mídia");
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Falha ao ler arquivo"));
        return;
      }

      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

export function QuickIngest({ onSubmitted, className }: QuickIngestProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  async function handleTextSubmit(event: React.FormEvent) {
    event.preventDefault();

    const rawContent = text.trim();
    if (!rawContent) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await submitJsonPayload({ rawContent, contentType: "TEXT" });
      setText("");
      onSubmitted();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleImageFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Selecione um arquivo de imagem válido.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("contentType", "IMAGE");
      formData.set("file", file);

      await submitMultipart(formData);
      onSubmitted();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleImageInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      await handleImageFile(file);
    }
    event.target.value = "";
  }

  async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      await handleImageFile(file);
    }
  }

  async function startRecording() {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, {
          type: blob.type || "audio/webm",
        });

        setLoading(true);
        setError(null);

        try {
          const audioBase64 = await fileToBase64(file);
          await submitJsonPayload({
            contentType: "VOICE",
            audioBase64,
            mimeType: file.type || "audio/webm",
            fileName: file.name,
          });
          onSubmitted();
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : "Erro inesperado");
        } finally {
          setLoading(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Não foi possível acessar o microfone.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-4 shadow-sm",
        dragOver && "border-blue-400 ring-2 ring-blue-100",
        className,
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <label htmlFor="quick-ingest" className="block text-sm font-medium text-slate-700">
          Entrada rápida
        </label>
        <span className="text-xs text-slate-400">Texto, foto ou voz</span>
      </div>

      <form onSubmit={handleTextSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="quick-ingest"
            type="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="O que você gastou ou recebeu agora?"
            className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none ring-blue-500 transition focus:ring-2"
            disabled={loading || recording}
          />

          <div className="flex gap-2">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleImageInputChange}
            />

            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={loading || recording}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-3 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              title="Enviar comprovante"
              aria-label="Enviar comprovante"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={loading}
              className={cn(
                "inline-flex items-center justify-center rounded-lg border px-3 py-3 transition disabled:opacity-50",
                recording
                  ? "border-rose-200 bg-rose-50 text-rose-600"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50",
              )}
              title={recording ? "Parar gravação" : "Gravar áudio"}
              aria-label={recording ? "Parar gravação" : "Gravar áudio"}
            >
              {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            <button
              type="submit"
              disabled={loading || recording || !text.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizontal className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Enviar</span>
            </button>
          </div>
        </div>
      </form>

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <Paperclip className="h-3.5 w-3.5" />
        Arraste uma foto de cupom/nota fiscal ou use os botões de câmera e microfone.
        {recording && (
          <span className="inline-flex items-center gap-1 font-medium text-rose-600">
            <MicOff className="h-3.5 w-3.5" />
            Gravando…
          </span>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

/** @deprecated Use QuickIngest */
export const QuickIngestInput = QuickIngest;
