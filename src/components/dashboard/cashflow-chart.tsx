"use client"

import React from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface CashflowChartData {
  data: string
  saldo: number
}

interface CashflowChartProps {
  data: CashflowChartData[]
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    compactDisplay: "short",
    maximumFractionDigits: 0,
  }).format(value)

export function CashflowChart({ data }: CashflowChartProps) {
  return (
    <Card className="col-span-1 lg:col-span-4">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
          Tendência de Fluxo de Caixa (30 dias)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/*
          Wrapper block to handle responsive container perfectly.
          Height must be strictly defined in the parent to avoid 0 height on mobile.
        */}
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="data"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickMargin={10}
                minTickGap={30}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickFormatter={formatCurrency}
                width={80}
              />
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                formatter={(value: any) => [formatCurrency(Number(value) || 0), "Saldo Projetado"]}
                labelStyle={{ fontWeight: "bold", color: "#334155", marginBottom: "4px" }}
              />
              <Area
                type="monotone"
                dataKey="saldo"
                stroke="#0ea5e9"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorSaldo)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
