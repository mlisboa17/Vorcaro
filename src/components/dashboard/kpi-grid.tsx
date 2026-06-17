import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, TrendingUp, TrendingDown, Inbox } from "lucide-react"

interface KpiData {
  saldoAtual: number
  entradas: number
  saidas: number
  conciliacoesPendentes: number
  trends?: {
    saldo: number
    entradas: number
    saidas: number
  }
}

interface KpiGridProps {
  data: KpiData
}

function formatBRL(val: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val)
}

export function KpiGrid({ data }: KpiGridProps) {
  const renderBadge = (value?: number) => {
    if (value === undefined) return null;
    const isPositive = value >= 0;
    return (
      <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold border ${isPositive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
        {isPositive ? '▲ +' : '▼ '}{value}%
      </span>
    )
  }

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
            Saldo Atual
          </CardTitle>
          <Wallet className="h-4 w-4 text-sky-500" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {formatBRL(data.saldoAtual)}
            </div>
            {renderBadge(data.trends?.saldo)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Disponível em contas</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
            Entradas
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {formatBRL(data.entradas)}
            </div>
            {renderBadge(data.trends?.entradas)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Receitas no período</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
            Saídas
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-rose-500" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {formatBRL(data.saidas)}
            </div>
            {renderBadge(data.trends?.saidas)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Despesas no período</p>
        </CardContent>
      </Card>

      <Card className={data.conciliacoesPendentes > 0 ? "border-amber-200 bg-amber-50/30" : ""}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
            Pendências
          </CardTitle>
          <Inbox className={data.conciliacoesPendentes > 0 ? "h-4 w-4 text-amber-500" : "h-4 w-4 text-slate-400"} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight text-slate-900">
            {data.conciliacoesPendentes}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {data.conciliacoesPendentes === 1 ? "Linha aguardando" : "Linhas aguardando"} conciliação
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
