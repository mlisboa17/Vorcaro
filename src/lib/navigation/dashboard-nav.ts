import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BellRing,
  CalendarClock,
  Cpu,
  Handshake,
  HandCoins,
  History,
  Inbox,
  Landmark,
  LayoutDashboard,
  LineChart,
  ListTodo,
  MessageCircle,
  Settings,
  Sparkles,
  Target,
  WalletCards,
  Zap,
} from "lucide-react";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: "notifications";
  /** Ativo apenas na rota exata (ex.: hub Vorcaro sem marcar subrotas). */
  exactMatch?: boolean;
};

export type DashboardNavGroup = {
  title: string;
  items: DashboardNavItem[];
};

export type VorcaroHubCard = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

/** Menu lateral — Sprint 14.8: blocos simplificados, rotas preservadas. */
export const DASHBOARD_NAV_GROUPS: DashboardNavGroup[] = [
  {
    title: "Visão Geral",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/vorcaro", label: "Vorcaro", icon: Sparkles, exactMatch: true },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { href: "/dashboard/inbox", label: "Caixa", icon: Inbox },
      { href: "/dashboard/transactions", label: "Extrato & Lançamentos", icon: History },
      { href: "/dashboard/receivables", label: "Contas a Receber", icon: HandCoins },
      { href: "/dashboard/installments", label: "Parcelamentos", icon: WalletCards },
    ],
  },
  {
    title: "Planejamento",
    items: [
      { href: "/dashboard/planning", label: "Planejamento Financeiro", icon: Target },
      { href: "/dashboard/cashflow", label: "Fluxo Futuro", icon: LineChart },
      { href: "/dashboard/commitments", label: "Compromissos", icon: CalendarClock },
    ],
  },
  {
    title: "Inteligência",
    items: [
      { href: "/dashboard/alerts", label: "Alertas", icon: Bell },
      {
        href: "/dashboard/notifications",
        label: "Notificações",
        icon: BellRing,
        badgeKey: "notifications",
      },
      { href: "/dashboard/vorcaro/timeline", label: "Timeline", icon: History },
      { href: "/dashboard/vorcaro/followups", label: "Pendências", icon: ListTodo },
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
    title: "Configurações",
    items: [
      { href: "/dashboard/settings", label: "Cadastros", icon: Settings },
      { href: "/dashboard/rules", label: "Regras & Automações", icon: Cpu },
    ],
  },
];

/** Cards do hub central Vorcaro — submódulos acessíveis sem poluir o menu. */
export const VORCARO_HUB_CARDS: VorcaroHubCard[] = [
  {
    href: "/dashboard/vorcaro/chat",
    title: "Chat",
    description: "Converse com o Vorcaro usando dados reais do seu financeiro.",
    icon: MessageCircle,
  },
  {
    href: "/dashboard/vorcaro/actions",
    title: "Ações",
    description: "Propostas assistidas para aprovar, rejeitar ou executar.",
    icon: Zap,
  },
  {
    href: "/dashboard/vorcaro/followups",
    title: "Pendências",
    description: "Follow-ups automáticos e lembretes do assistente.",
    icon: ListTodo,
  },
  {
    href: "/dashboard/vorcaro/timeline",
    title: "Timeline / Memória",
    description: "Evolução financeira, marcos e memória patrimonial.",
    icon: History,
  },
  {
    href: "/dashboard/advisor",
    title: "Insights",
    description: "Análises e recomendações estratégicas do consultor.",
    icon: Sparkles,
  },
];

/** Rota preservada fora do menu principal (gestão de recorrências). */
export const DASHBOARD_RECURRING_ROUTE = "/dashboard/recurring";
