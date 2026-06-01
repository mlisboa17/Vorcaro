import Link from "next/link";
import { Inbox, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          <Sparkles className="h-4 w-4" />
          Logos Financeiro
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Assessor Inteligente de Finanças
        </h1>
        <p className="mt-3 text-slate-600">
          Infraestrutura operacional — IA, filas, regras e aprendizado contínuo.
        </p>
        <Link
          href="/dashboard/inbox"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <Inbox className="h-4 w-4" />
          Abrir Caixa Financeira
        </Link>
      </div>
    </main>
  );
}

