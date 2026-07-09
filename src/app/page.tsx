import Link from "next/link";
import {
  Inbox,
  Sparkles,
  CalendarClock,
  CreditCard,
  TrendingUp,
  RefreshCw,
  ShieldCheck,
  Zap,
  MessageCircle,
} from "lucide-react";

const FEATURES = [
  {
    icon: Inbox,
    title: "Caixa Financeiro unificado",
    description:
      "Receba lançamentos de extratos, faturas e WhatsApp/Telegram num único lugar, já categorizados.",
  },
  {
    icon: Sparkles,
    title: "Vorcaro, seu consultor de IA",
    description:
      "Converse em linguagem natural e receba análises, alertas e recomendações sobre suas finanças.",
  },
  {
    icon: CalendarClock,
    title: "Fluxo de caixa em tempo real",
    description:
      "Visualize entradas, saídas e saldo projetado para tomar decisões com antecedência.",
  },
  {
    icon: CreditCard,
    title: "Parcelas sob controle",
    description:
      "Acompanhe séries de parcelamento, vencimentos e o impacto futuro no seu orçamento.",
  },
  {
    icon: RefreshCw,
    title: "Recorrências automatizadas",
    description:
      "Assinaturas, contas fixas e receitas recorrentes identificadas e projetadas sem esforço manual.",
  },
  {
    icon: TrendingUp,
    title: "Investimentos consolidados",
    description:
      "Acompanhe a evolução do seu patrimônio ao lado das suas finanças do dia a dia.",
  },
];

const STEPS = [
  {
    title: "Conecte suas finanças",
    description: "Importe extratos e faturas ou integre via Telegram/WhatsApp.",
  },
  {
    title: "Deixe o Vorcaro organizar",
    description: "Categorização automática, regras inteligentes e aprendizado contínuo.",
  },
  {
    title: "Decida com clareza",
    description: "Fluxo de caixa, alertas e recomendações prontos para agir.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white text-slate-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <div className="inline-flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          Logos Financeiro
        </div>
        <Link
          href="/auth/login"
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
        >
          Entrar
        </Link>
      </header>

      <section className="mx-auto flex max-w-6xl flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-24">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-white">
          <Sparkles className="h-3.5 w-3.5" />
          Assessor financeiro com IA
        </div>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Suas finanças organizadas, analisadas e explicadas por um assistente de IA
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-600">
          O Logos Financeiro centraliza extratos, faturas, parcelas e recorrências — e o
          Vorcaro, seu consultor de IA, transforma esses dados em decisões claras.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <Inbox className="h-4 w-4" />
            Começar agora
          </Link>
          <Link
            href="#funcionalidades"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-6 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
          >
            Ver funcionalidades
          </Link>
        </div>
      </section>

      <section id="funcionalidades" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Tudo o que você precisa para controlar seu dinheiro
          </h2>
          <p className="mt-2 text-slate-600">
            Uma plataforma só, sem planilhas espalhadas.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-900 py-16 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Como funciona</h2>
            <p className="mt-2 text-slate-300">Três passos para clareza financeira.</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <div key={step.title} className="text-center sm:text-left">
                <div className="mx-auto mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-900 sm:mx-0">
                  {index + 1}
                </div>
                <h3 className="text-base font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-5">
            <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-900" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Seus dados, sua holding</h3>
              <p className="mt-1 text-sm text-slate-600">
                Estrutura multi-tenant isolada por usuário desde o primeiro acesso.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-5">
            <Zap className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-900" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Automação real</h3>
              <p className="mt-1 text-sm text-slate-600">
                Regras e categorização aprendem com o seu histórico de lançamentos.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-5">
            <MessageCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-900" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Converse, não preencha</h3>
              <p className="mt-1 text-sm text-slate-600">
                Pergunte ao Vorcaro e receba respostas com base nos seus dados reais.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-20 text-center sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Pronto para organizar suas finanças?
        </h2>
        <p className="mt-3 text-slate-600">
          Entre com sua conta Google e comece a usar o Logos Financeiro agora.
        </p>
        <Link
          href="/auth/login"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <Inbox className="h-4 w-4" />
          Acessar minha Caixa Financeira
        </Link>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        Logos Financeiro — assessor financeiro com IA.
      </footer>
    </main>
  );
}
