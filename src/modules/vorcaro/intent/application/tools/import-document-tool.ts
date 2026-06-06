import type { PrismaClient } from "@prisma/client";
import { buildFinancialDocumentServices } from "@/lib/api/financial-documents";

export class ImportDocumentTool {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(userId: string, question: string) {
    const { repo } = buildFinancialDocumentServices(this.prisma);
    const pending = await repo.listSuggestions(userId, "PENDING", 5);
    const recent = await repo.listDocuments(userId, undefined, 5);

    const wantsPending = /pendente|aguardando|revis/i.test(question);

    if (wantsPending) {
      return {
        intent: "IMPORT_DOCUMENT" as const,
        title: "Importações pendentes",
        summary:
          pending.length > 0
            ? `Você tem ${pending.length} sugestão(ões) aguardando revisão.`
            : "Não há importações pendentes no momento.",
        facts: pending.slice(0, 5).map((s) => {
          const amount = s.amount != null ? `R$ ${Number(s.amount).toFixed(2)}` : "valor —";
          return `${s.supplier ?? s.description ?? "Comprovante"} · ${amount}`;
        }),
        metrics: { pending: pending.length, recentDocuments: recent.length },
        recommendations: ["Revise cada sugestão antes de confirmar o lançamento."],
        suggestedActions:
          pending.length > 0
            ? [
                {
                  type: "OPEN_DASHBOARD_SECTION" as const,
                  title: "Revisar importações",
                  description: "Abrir fila de revisão humana",
                  payload: { section: "/dashboard/import/review" },
                },
              ]
            : undefined,
      };
    }

    return {
      intent: "IMPORT_DOCUMENT" as const,
      title: "Captura de documentos",
      summary:
        "Envie PDFs ou imagens pelo dashboard ou Telegram. Eu extraio dados e preparo sugestões — nada é lançado sem sua confirmação.",
      facts: recent.slice(0, 3).map((d) => `${d.fileName} · ${d.status}`),
      metrics: { recentDocuments: recent.length, pendingSuggestions: pending.length },
      recommendations: [
        "Use /dashboard/import para upload com drag-and-drop.",
        "Comprovantes PIX/TED são classificados automaticamente quando possível.",
      ],
      suggestedActions: [
        {
          type: "OPEN_DASHBOARD_SECTION" as const,
          title: "Importar comprovante",
          description: "Enviar PDF ou imagem",
          payload: { section: "/dashboard/import" },
        },
      ],
    };
  }
}
