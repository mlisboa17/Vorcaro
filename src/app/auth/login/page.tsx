"use client";
import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

// Google Font
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") ?? "/dashboard/statements";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        router.replace(callbackUrl);
      }
    } catch (err) {
      setError("Falha ao autenticar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && (
        <div className="rounded-md bg-red-100 p-2 text-sm text-red-800">
          {error}
        </div>
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
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Senha
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white dark:bg-gray-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="relative flex w-full items-center justify-center rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "Entrar"
          )}
        </button>
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <section className={`flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 ${inter.variable}`}>
      <div className="w-full max-w-md rounded-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg shadow-xl p-8 space-y-6">
        <h1 className="text-3xl font-extrabold text-center text-gray-800 dark:text-gray-100 tracking-wider">
          Acesso ao Sistema
        </h1>
        <Suspense fallback={<div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>}>
          <LoginForm />
        </Suspense>
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          Acesse com seu e-mail e senha cadastrados.
        </div>
      </div>
    </section>
  );
}
