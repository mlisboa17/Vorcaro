import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CalendarClock,
  Cpu,
  Handshake,
  HandCoins,
  History,
  Inbox,
  Landmark,
  LayoutDashboard,
  LineChart,
  Settings,
  Sparkles,
  Target,
  WalletCards,
} from "lucide-react";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type DashboardNavGroup = {
  title: string;
  items: DashboardNavItem[];
};

/** Menu lateral do dashboard — ordem e agrupamento por domínio de negócio. */
export const DASHBOARD_NAV_GROUPS: DashboardNavGroup[] = [
  {
    title: "Visão Executiva",
    items: [
      { href: "/dashboard", label: "Dashboard Executivo", icon: LayoutDashboard },
      { href: "/dashboard/alerts", label: "Alertas Financeiros", icon: Bell },
      { href: "/dashboard/advisor", label: "IA Financeira", icon: Sparkles },
    ],
  },
  {
    title: "Planejamento",
    items: [
      { href: "/dashboard/planning", label: "Planejamento Financeiro", icon: Target },
      { href: "/dashboard/cashflow", label: "Fluxo de Caixa Futuro", icon: LineChart },
      { href: "/dashboard/commitments", label: "Compromissos Recorrentes", icon: CalendarClock },
    ],
  },
  {
    title: "Operações Financeiras",
    items: [
      { href: "/dashboard/inbox", label: "Caixa Financeira", icon: Inbox },
      { href: "/dashboard/transactions", label: "Extrato & Lançamentos", icon: History },
      { href: "/dashboard/receivables", label: "Contas a Receber", icon: HandCoins },
      { href: "/dashboard/installments", label: "Parcelamentos", icon: WalletCards },
    ],
  },
  {
    title: "Patrimônio",
    items: [
      { href: "/dashboard/patrimony", label: "Patrimônio", icon: Landmark },
      { href: "/dashboard/consorcios", label: "Consórcios", icon: Handshake },
    ],
  },
  {
    title: "Configuração",
    items: [{ href: "/dashboard/settings", label: "Cadastros", icon: Settings }],
  },
  {
    title: "Inteligência & Automação",
    items: [{ href: "/dashboard/rules", label: "Cérebro & Automações", icon: Cpu }],
  },
];

/** Rota preservada fora do menu principal (gestão de recorrências). */
export const DASHBOARD_RECURRING_ROUTE = "/dashboard/recurring";
