import type { VorcaroFollowUpStatus } from "@prisma/client";
import type { VorcaroToolResult } from "@/modules/vorcaro/intent/domain/types/vorcaro-intent";
import type { VorcaroFollowUpRecord } from "../../domain/types/vorcaro-followup";
import { VorcaroFollowUpService } from "../services/vorcaro-followup.service";

const STATUS_LABELS: Record<VorcaroFollowUpStatus, string> = {
  PENDING: "Pendente",
  ACTIVE: "Ativo",
  COMPLETED: "Concluído",
  DISMISSED: "Dispensado",
  EXPIRED: "Expirado",
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export class FollowUpTool {
  constructor(private readonly followUps: VorcaroFollowUpService) {}

  async execute(userId: string): Promise<VorcaroToolResult> {
    const items = await this.followUps.listFollowUps(userId);
    const open = items.filter((i) => i.status === "PENDING" || i.status === "ACTIVE");

    const facts = open.length
      ? open.map((item) => formatFollowUpLine(item))
      : ["Nenhuma pendência ativa no momento."];

    const summary =
      open.length === 0
        ? "Você não tem acompanhamentos pendentes."
        : open.length === 1
          ? "Há 1 pendência ativa para acompanhar."
          : `Há ${open.length} pendências ativas para acompanhar.`;

    return {
      intent: "FOLLOWUPS",
      title: "Pendências e acompanhamentos",
      summary,
      facts,
      metrics: {
        total: items.length,
        open: open.length,
        byStatus: countByStatus(items),
      },
      recommendations: open.length
        ? [
            "Revise cada item no dashboard em /dashboard/vorcaro/followups.",
            "Conclua ou dispense pendências já resolvidas.",
          ]
        : ["Continue acompanhando alertas e metas pelo Vorcaro."],
    };
  }
}

function formatFollowUpLine(item: VorcaroFollowUpRecord): string {
  const label = STATUS_LABELS[item.status];
  const next = item.nextCheckAt ? ` — próximo lembrete ${formatDate(item.nextCheckAt)}` : "";
  return `[${label}] ${item.title}${next}`;
}

function countByStatus(items: VorcaroFollowUpRecord[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    counts[item.status] = (counts[item.status] ?? 0) + 1;
  }
  return counts;
}
