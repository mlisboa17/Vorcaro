import type { VorcaroToolResult } from "@/modules/vorcaro/intent/domain/types/vorcaro-intent";
import type { VorcaroToolAction } from "../../domain/types/vorcaro-action";

export function deriveSuggestedActionsFromToolResults(
  results: VorcaroToolResult[],
): VorcaroToolAction[] {
  const actions: VorcaroToolAction[] = [];
  const seen = new Set<string>();

  const push = (action: VorcaroToolAction) => {
    const key = `${action.type}:${JSON.stringify(action.payload)}`;
    if (seen.has(key)) return;
    seen.add(key);
    actions.push(action);
  };

  for (const result of results) {
    if (result.suggestedActions?.length) {
      for (const a of result.suggestedActions) {
        push(a);
      }
      continue;
    }

    const metrics = result.metrics ?? {};

    switch (result.intent) {
      case "RECEIVABLES": {
        const receivableId = metrics.firstOverdueReceivableId;
        if (typeof receivableId === "string" && metrics.overdueCount) {
          push({
            type: "OPEN_RECEIVABLE",
            title: "Abrir recebível atrasado",
            description: "Deseja abrir este recebível no dashboard?",
            payload: { receivableId },
          });
        }
        break;
      }
      case "ALERTS": {
        const alertId = metrics.firstCriticalAlertId;
        if (typeof alertId === "string") {
          push({
            type: "OPEN_ALERT",
            title: "Abrir alerta crítico",
            description: "Deseja abrir este alerta?",
            payload: { alertId },
          });
        } else if (Number(metrics.critical) > 0) {
          push({
            type: "OPEN_ALERT",
            title: "Abrir alertas",
            description: "Deseja abrir a central de alertas?",
            payload: {},
          });
        }
        break;
      }
      case "GOALS": {
        const goalId = metrics.firstAtRiskGoalId;
        if (typeof goalId === "string") {
          push({
            type: "OPEN_GOAL",
            title: "Abrir meta em risco",
            description: "Deseja revisar esta meta no planejamento?",
            payload: { goalId },
          });
        }
        break;
      }
      case "MONEY_LEAK":
        if (Number(metrics.leakCount) > 0) {
          push({
            type: "OPEN_MONEY_LEAK",
            title: "Análise de gastos",
            description: "Deseja abrir a análise de gastos (vazamentos)?",
            payload: {},
          });
        }
        break;
      case "SUBSCRIPTIONS":
        if (Number(metrics.duplicates) > 0) {
          push({
            type: "OPEN_SUBSCRIPTION",
            title: "Revisar assinaturas",
            description: "Deseja abrir recorrentes e assinaturas?",
            payload: {},
          });
        }
        break;
      case "RULES_AUTOMATIONS":
        push({
          type: "CREATE_RULE_SUGGESTION",
          title: "Regras e automações",
          description: "Deseja abrir Regras e Automações para revisar?",
          payload: {},
        });
        break;
      case "NOTIFICATIONS": {
        const notificationId = metrics.firstNotificationId;
        if (typeof notificationId === "string" && Number(metrics.unread) > 0) {
          push({
            type: "OPEN_NOTIFICATION",
            title: "Abrir notificação",
            description: "Deseja abrir esta notificação?",
            payload: { notificationId },
          });
        } else if (Number(metrics.unread) > 0) {
          push({
            type: "OPEN_NOTIFICATION",
            title: "Central de notificações",
            description: "Deseja abrir a central de notificações?",
            payload: {},
          });
        }
        break;
      }
      case "COMMITMENTS":
        push({
          type: "OPEN_COMMITMENT",
          title: "Compromissos do mês",
          description: "Deseja abrir os compromissos mensais?",
          payload: {},
        });
        break;
      case "TIMELINE":
        push({
          type: "OPEN_TIMELINE",
          title: "Linha do tempo",
          description: "Deseja abrir a memória financeira (linha do tempo)?",
          payload: {},
        });
        break;
      default:
        break;
    }
  }

  return actions.slice(0, 3);
}

export function formatProposalCtaBlock(
  proposals: Array<{ id: string; title: string; description: string; expiresAt: Date }>,
): string {
  if (proposals.length === 0) return "";

  const lines = [
    "",
    "**Assistência Vorcaro** — confirme para abrir no dashboard (sem alterar dados):",
  ];
  for (const p of proposals) {
    const exp = p.expiresAt.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    lines.push(`- **${p.title}** — ${p.description}`);
    lines.push(`  Responda *sim* ou *não* (válido até ${exp}, id: \`${p.id}\`).`);
  }
  return lines.join("\n");
}
