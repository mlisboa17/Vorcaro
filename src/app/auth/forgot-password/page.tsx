"use client";
import { useState } from "react";
import Link from "next/link";
import { Loader2, Check, Copy } from "lucide-react";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResetLink(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { message?: string; resetToken?: string; error?: unknown };
      if (!res.ok) {
        throw new Error("Falha ao solicitar redefinição.");
      }
      if (data.resetToken) {
        const origin = window.location.origin;
        setResetLink(`${origin}/auth/reset-password?token=${data.resetToken}`);
      } else {
        setError("Se o e-mail estiver cadastrado, um link seria gerado. Verifique o e-mail informado.");
      }
    } catch {
      setError("Falha ao solicitar redefinição. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!resetLink) return;
    await navigator.clipboard.writeText(resetLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section
      className={`flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 ${inter.variable}`}
    >
      <div className="w-full max-w-md rounded-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg shadow-xl p-8 space-y-6">
        <h1 className="text-2xl font-extrabold text-center text-gray-800 dark:text-gray-100 tracking-wide">
          Redefinir senha
        </h1>

        {!resetLink ? (
          <>
            <p className="text-sm text-center text-gray-500 dark:text-gray-400">
              Informe seu e-mail cadastrado para gerar um link de redefinição.
            </p>
            {error && (
              <div className="rounded-md bg-red-100 p-2 text-sm text-red-800">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white dark:bg-gray-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="relative flex w-full items-center justify-center rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Gerar link de redefinição"}
              </button>
            </form>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-md bg-emerald-100 p-3 text-sm text-emerald-800">
              <Check className="mt-0.5 h-4 w-4 shrink-0" />
              Link gerado com sucesso. Válido por 30 minutos.
            </div>
            <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3">
              <p className="break-all font-mono text-xs text-gray-700 dark:text-gray-300">{resetLink}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void copyLink()}
                className="flex flex-1 items-center justify-center gap-2 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiado!" : "Copiar link"}
              </button>
              <Link
                href={resetLink}
                className="flex flex-1 items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Abrir agora
              </Link>
            </div>
          </div>
        )}

        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <Link href="/auth/login" className="text-indigo-600 hover:underline">
            Voltar para o login
          </Link>
        </div>
      </div>
    </section>
  );
}
