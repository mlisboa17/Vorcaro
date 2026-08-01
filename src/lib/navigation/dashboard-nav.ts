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
  FileUp,
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

/** Menu lateral refatorado (Sprint 15) - 5 Macro-Categorias com Abas. */
export const DASHBOARD_NAV_GROUPS: DashboardNavGroup[] = [
  {
    title: "Visão Geral",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exactMatch: true },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { href: "/dashboard/transactions", label: "Transações", icon: History },
      { href: "/dashboard/receivables", label: "Recebíveis", icon: HandCoins },
      { href: "/dashboard/patrimony", label: "Patrimônio", icon: Landmark },
    ],
  },
  {
    title: "Bancos & Extratos",
    items: [
      { href: "/dashboard/accounts", label: "Contas Bancárias", icon: WalletCards },
      { href: "/dashboard/statements", label: "Extratos & Importação", icon: FileUp },
    ],
  },
  {
    title: "Inteligência & Inbox",
    items: [
      { href: "/dashboard/inbox", label: "Caixa de Entrada", icon: Inbox },
      { href: "/dashboard/vorcaro", label: "Assistente Vorcaro", icon: Sparkles },
      { href: "/dashboard/rules", label: "Regras de Automação", icon: Cpu },
      { href: "/dashboard/planning", label: "Planejamento & Metas", icon: Target },
      {
        href: "/dashboard/notifications",
        label: "Notificações",
        icon: BellRing,
        badgeKey: "notifications",
      },
    ],
  },
  {
    title: "Configurações",
    items: [
      { href: "/dashboard/settings", label: "Ajustes Gerais", icon: Settings },
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
