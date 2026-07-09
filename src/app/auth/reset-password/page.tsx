"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (!token) {
      setError("Token de redefinição ausente ou inválido.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Token inválido ou expirado.");
      }
      setSuccess(true);
      setTimeout(() => router.replace("/auth/login"), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao redefinir senha.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="flex items-start gap-2 rounded-md bg-red-100 p-3 text-sm text-red-800">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        Link inválido. Solicite um novo em{" "}
        <Link href="/auth/forgot-password" className="underline">
          Redefinir senha
        </Link>
        .
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-start gap-2 rounded-md bg-emerald-100 p-3 text-sm text-emerald-800">
        <Check className="mt-0.5 h-4 w-4 shrink-0" />
        Senha redefinida com sucesso! Redirecionando para o login...
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="rounded-md bg-red-100 p-2 text-sm text-red-800">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nova senha
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white dark:bg-gray-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600"
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Confirmar nova senha
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white dark:bg-gray-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="relative flex w-full items-center justify-center rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Redefinir senha"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <section
      className={`flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 ${inter.variable}`}
    >
      <div className="w-full max-w-md rounded-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg shadow-xl p-8 space-y-6">
        <h1 className="text-2xl font-extrabold text-center text-gray-800 dark:text-gray-100 tracking-wide">
          Definir nova senha
        </h1>
        <Suspense fallback={<div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>}>
          <ResetPasswordForm />
        </Suspense>
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <Link href="/auth/login" className="text-indigo-600 hover:underline">
            Voltar para o login
          </Link>
        </div>
      </div>
    </section>
  );
}
