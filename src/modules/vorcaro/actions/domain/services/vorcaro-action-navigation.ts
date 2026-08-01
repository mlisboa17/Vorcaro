import type { VorcaroActionType } from "../types/vorcaro-action";
import type { VorcaroActionExecutionResult } from "../types/vorcaro-action";

function requireId(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function buildNavigationTarget(
  actionType: VorcaroActionType,
  payload: Record<string, unknown>,
): Pick<VorcaroActionExecutionResult, "targetUrl" | "navigationPayload" | "title" | "message"> {
  switch (actionType) {
    case "OPEN_RECEIVABLE": {
      const id = requireId(payload, "receivableId");
      const url = id ? `/dashboard/receivables?id=${encodeURIComponent(id)}` : "/dashboard/receivables";
      return {
        targetUrl: url,
        navigationPayload: { receivableId: id },
        title: "Abrir recebível",
        message: "Abrindo a tela de recebíveis no dashboard.",
      };
    }
    case "OPEN_ALERT": {
      const id = requireId(payload, "alertId");
      const url = id ? `/dashboard/notifications?type=alert&id=${encodeURIComponent(id)}` : "/dashboard/notifications?type=alert";
      return {
        targetUrl: url,
        navigationPayload: { alertId: id },
        title: "Abrir alerta",
        message: "Abrindo a central de alertas.",
      };
    }
    case "OPEN_GOAL": {
      const id = requireId(payload, "goalId");
      const url = id ? `/dashboard/planning?goal=${encodeURIComponent(id)}` : "/dashboard/planning";
      return {
        targetUrl: url,
        navigationPayload: { goalId: id },
        title: "Abrir meta",
        message: "Abrindo o planejamento financeiro.",
      };
    }
    case "OPEN_COMMITMENT":
      return {
        targetUrl: "/dashboard/commitments",
        navigationPayload: {},
        title: "Abrir compromissos",
        message: "Abrindo compromissos mensais.",
      };
    case "OPEN_SUBSCRIPTION":
      return {
        targetUrl: "/dashboard/recurring",
        navigationPayload: {},
        title: "Abrir assinaturas",
        message: "Abrindo recorrentes e assinaturas.",
      };
    case "OPEN_MONEY_LEAK":
      return {
        targetUrl: "/dashboard/transactions",
        navigationPayload: {},
        title: "Abrir análise de gastos",
        message: "Abrindo transações para revisar gastos.",
      };
    case "OPEN_TIMELINE":
      return {
        targetUrl: "/dashboard/vorcaro/timeline",
        navigationPayload: {},
        title: "Abrir linha do tempo",
        message: "Abrindo memória financeira longitudinal.",
      };
    case "OPEN_NOTIFICATION": {
      const id = requireId(payload, "notificationId");
      const url = id
        ? `/dashboard/notifications?id=${encodeURIComponent(id)}`
        : "/dashboard/notifications";
      return {
        targetUrl: url,
        navigationPayload: { notificationId: id },
        title: "Abrir notificação",
        message: "Abrindo a central de notificações.",
      };
    }
    case "OPEN_DASHBOARD_SECTION": {
      const section =
        typeof payload.section === "string" && payload.section.startsWith("/")
          ? payload.section
          : "/dashboard";
      return {
        targetUrl: section,
        navigationPayload: { section },
        title: "Abrir seção",
        message: "Abrindo a seção solicitada no dashboard.",
      };
    }
    case "CREATE_RULE_SUGGESTION":
      return {
        targetUrl: "/dashboard/rules",
        navigationPayload: {},
        title: "Regras e automações",
        message: "Abrindo regras para revisão (nenhuma regra será criada automaticamente).",
      };
    case "CREATE_GOAL_SUGGESTION":
      return {
        targetUrl: "/dashboard/planning",
        navigationPayload: { mode: "suggest" },
        title: "Sugerir meta",
        message: "Abrindo planejamento (nenhuma meta será criada automaticamente).",
      };
    default:
      return {
        targetUrl: "/dashboard",
        navigationPayload: {},
        title: "Dashboard",
        message: "Abrindo o dashboard.",
      };
  }
}
