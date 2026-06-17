import type { LucideIcon } from "lucide-react";
import {
  Inbox,
  CalendarClock,
  Landmark,
  Handshake,
  PiggyBank,
  FileUp,
  MessageCircle,
  Zap,
  ListTodo,
  History,
  Sparkles,
  Settings,
} from "lucide-react";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: "notifications";
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

export const DASHBOARD_NAV_GROUPS: DashboardNavGroup[] = [
  {
    title: "Menu Principal",
    items: [
      { href: "/dashboard/inbox", label: "Caixa Financeiro", icon: Inbox },
      { href: "/dashboard/cashflow", label: "Fluxo de Caixa", icon: CalendarClock },
      { href: "/dashboard/statements", label: "Importar Extrato/Fatura", icon: FileUp },
    ],
  },
  {
    title: "Configurações",
    items: [
      { href: "/dashboard/settings", label: "Cadastros", icon: Settings },
    ],
  },
];

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

export const DASHBOARD_RECURRING_ROUTE = "/dashboard/recurring";
