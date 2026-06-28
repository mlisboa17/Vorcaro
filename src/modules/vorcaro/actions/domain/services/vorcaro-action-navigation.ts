import type { VorcaroActionType } from "../types/vorcaro-action";
import type { VorcaroActionExecutionResult } from "../types/vorcaro-action";
import { VORCARO_NAVIGATION_ROUTES } from "../constants/vorcaro-navigation-routes";

function requireId(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

type ActionMetadata = {
  title: string;
  message: string;
  idParam?: { payload: string; query: string };
};

const ACTION_METADATA: Record<VorcaroActionType, ActionMetadata> = {
  OPEN_RECEIVABLE: {
    title: "Abrir recebível",
    message: "Abrindo a tela de recebíveis no dashboard.",
    idParam: { payload: "receivableId", query: "id" },
  },
  OPEN_ALERT: {
    title: "Abrir alerta",
    message: "Abrindo a central de alertas.",
    idParam: { payload: "alertId", query: "id" },
  },
  OPEN_GOAL: {
    title: "Abrir meta",
    message: "Abrindo o planejamento financeiro.",
    idParam: { payload: "goalId", query: "goal" },
  },
  OPEN_COMMITMENT: {
    title: "Abrir compromissos",
    message: "Abrindo compromissos mensais.",
  },
  OPEN_SUBSCRIPTION: {
    title: "Abrir assinaturas",
    message: "Abrindo recorrentes e assinaturas.",
  },
  OPEN_MONEY_LEAK: {
    title: "Abrir análise de gastos",
    message: "Abrindo transações para revisar gastos.",
  },
  OPEN_TIMELINE: {
    title: "Abrir linha do tempo",
    message: "Abrindo memória financeira longitudinal.",
  },
  OPEN_NOTIFICATION: {
    title: "Abrir notificação",
    message: "Abrindo a central de notificações.",
    idParam: { payload: "notificationId", query: "id" },
  },
  OPEN_DASHBOARD_SECTION: {
    title: "Abrir seção",
    message: "Abrindo a seção solicitada no dashboard.",
  },
  CREATE_RULE_SUGGESTION: {
    title: "Regras e automações",
    message: "Abrindo regras para revisão (nenhuma regra será criada automaticamente).",
  },
  CREATE_GOAL_SUGGESTION: {
    title: "Sugerir meta",
    message: "Abrindo planejamento (nenhuma meta será criada automaticamente).",
  },
};

export function buildNavigationTarget(
  actionType: VorcaroActionType,
  payload: Record<string, unknown>,
): Pick<VorcaroActionExecutionResult, "targetUrl" | "navigationPayload" | "title" | "message"> {
  const baseUrl = VORCARO_NAVIGATION_ROUTES[actionType] || VORCARO_NAVIGATION_ROUTES.OPEN_DASHBOARD_SECTION;
  const meta = ACTION_METADATA[actionType];

  // Handle OPEN_DASHBOARD_SECTION special case
  if (actionType === "OPEN_DASHBOARD_SECTION") {
    const section =
      typeof payload.section === "string" && payload.section.startsWith("/")
        ? payload.section
        : "/dashboard";
    return {
      targetUrl: section,
      navigationPayload: { section },
      title: meta.title,
      message: meta.message,
    };
  }

  // Handle routes with ID parameters
  if (meta.idParam) {
    const id = requireId(payload, meta.idParam.payload);
    const url = id ? `${baseUrl}?${meta.idParam.query}=${encodeURIComponent(id)}` : baseUrl;
    return {
      targetUrl: url,
      navigationPayload: { [meta.idParam.payload]: id },
      title: meta.title,
      message: meta.message,
    };
  }

  // Handle CREATE_GOAL_SUGGESTION special case (mode param)
  if (actionType === "CREATE_GOAL_SUGGESTION") {
    return {
      targetUrl: baseUrl,
      navigationPayload: { mode: "suggest" },
      title: meta.title,
      message: meta.message,
    };
  }

  // Default: simple route without parameters
  return {
    targetUrl: baseUrl,
    navigationPayload: {},
    title: meta.title,
    message: meta.message,
  };
}
