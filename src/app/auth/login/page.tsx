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
            E‑mail
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

      <div className="relative flex items-center my-4">
        <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
        <span className="flex-shrink mx-4 text-xs text-gray-500 dark:text-gray-400">ou</span>
        <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
      </div>

      <button
        onClick={() => signIn("google", { callbackUrl })}
        type="button"
        className="flex w-full items-center justify-center gap-3 rounded-md border border-gray-300 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 transition-colors shadow-sm"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" width="24" height="24">
          <path
            fill="#EA4335"
            d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.23 2.673 1.255 6.6L5.266 9.765z"
          />
          <path
            fill="#34A853"
            d="M16.04 15.342c-1.044.69-2.4 1.109-4.04 1.109a7.07 7.07 0 0 1-6.733-4.854L1.256 14.73A12.013 12.013 0 0 0 12 24c3.245 0 6.18-1.09 8.41-2.964l-4.37-3.694z"
          />
          <path
            fill="#4285F4"
            d="M23.77 12.273c0-.818-.082-1.609-.227-2.373H12v4.51h6.6a5.64 5.64 0 0 1-2.455 3.709l4.37 3.694c2.553-2.355 4.03-5.818 4.03-9.54z"
          />
          <path
            fill="#FBBC05"
            d="M5.266 9.765L1.255 6.6A11.96 11.96 0 0 0 0 12c0 1.927.455 3.745 1.255 5.382l4.01-3.136A7.077 7.077 0 0 1 4.91 12c0-.8.145-1.573.355-2.235z"
          />
        </svg>
        Entrar com Google
      </button>
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
          O registro de novas contas é feito diretamente no login via Google.
        </div>
      </div>
    </section>
  );
}
