import type { PrismaClient } from "@prisma/client";
import { buildFinancialDocumentServices } from "@/lib/api/financial-documents";

export class ReviewDocumentTool {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(userId: string) {
    const { repo } = buildFinancialDocumentServices(this.prisma);
    const pending = await repo.listSuggestions(userId, "PENDING", 10);

    return {
      intent: "REVIEW_DOCUMENT" as const,
      title: "Revisão de importações",
      summary:
        pending.length > 0
          ? `${pending.length} documento(s) aguardando sua revisão antes de virar lançamento.`
          : "Nenhum documento pendente de revisão.",
      facts: pending.map((s) => {
        const conf = s.confidence >= 85 ? "alta" : s.confidence >= 60 ? "média" : "baixa";
        const amount = s.amount != null ? `R$ ${Number(s.amount).toFixed(2)}` : "—";
        return `${s.supplier ?? s.description ?? "Item"} · ${amount} · confiança ${conf}${
          s.isLearnedPattern ? " · aprendido" : ""
        }`;
      }),
      metrics: { pending: pending.length },
      recommendations: [
        "Aprove apenas após conferir valor, data e categoria.",
        "Edições alimentam o aprendizado para próximas importações.",
      ],
      suggestedActions:
        pending.length > 0
          ? [
              {
                type: "OPEN_DASHBOARD_SECTION" as const,
                title: "Abrir revisão",
                description: "Confirmar ou editar sugestões",
                payload: { section: "/dashboard/import/review" },
              },
            ]
          : undefined,
    };
  }
}
