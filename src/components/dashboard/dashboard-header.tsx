"use client"

import React, { useCallback, useTransition } from "react"
import { Calendar, Building2, Loader2 } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { VorcaroLogo } from "@/components/ui/vorcaro-logo"

interface CompanyOption {
  id: string
  name: string
}

interface DashboardHeaderProps {
  userName: string
  companies: CompanyOption[]
}

export function DashboardHeader({ userName, companies }: DashboardHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentCompany = searchParams.get("companyId") || ""
  const currentPeriod = searchParams.get("period") || "30d"

  const updateFilters = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [pathname, router, searchParams]
  )

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <div className="mb-2">
          <VorcaroLogo className="h-7 md:h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          Olá, {userName}
          {isPending && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        </h1>
        <p className="text-sm text-slate-500">
          Acompanhe os resultados e métricas financeiras da sua operação.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex items-center">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Building2 className="h-4 w-4 text-slate-400" />
          </div>
          <select
            disabled={isPending}
            value={currentCompany}
            onChange={(e) => updateFilters("companyId", e.target.value)}
            className="block w-full rounded-lg border-slate-200 py-2 pl-10 pr-10 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white shadow-sm"
          >
            <option value="">Todas as Empresas</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="relative flex items-center">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Calendar className="h-4 w-4 text-slate-400" />
          </div>
          <select
            disabled={isPending}
            value={currentPeriod}
            onChange={(e) => updateFilters("period", e.target.value)}
            className="block w-full rounded-lg border-slate-200 py-2 pl-10 pr-10 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white shadow-sm"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>
        </div>
      </div>
    </div>
  )
}
