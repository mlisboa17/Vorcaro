import type { PrismaClient } from "@prisma/client";
import { AiRouterService } from "@/modules/ai/application/services/ai-router.service";
import { buildCashflowProjectionService } from "@/modules/cashflow/application/services/cashflow-projection.service";
import { InstallmentReadModelService } from "@/modules/installments/application/services/installment-read-model.service";
import { PrismaInstallmentReadRepository } from "@/modules/installments/infrastructure/prisma-installment-read.repository";
import { MonthFinancialOverviewService } from "@/modules/executive-dashboard/application/services/month-financial-overview.service";
import type { AdvisorInsight } from "@/types/financial-advisor";
import { ADVISOR_SYSTEM_PROMPT } from "../../domain/constants";
import { FinancialDataAggregatorService } from "./financial-data-aggregator.service";

type InsightTrigger = {
  id: string;
  ruleId: string;
  title: string;
  severity: "info" | "warning" | "critical";
  fact: string;
};

export class FinancialInsightsService {
  private readonly aggregator: FinancialDataAggregatorService;
  private readonly aiRouter: AiRouterService;

  constructor(
    private readonly prisma: PrismaClient,
    aiRouter?: AiRouterService,
  ) {
    this.aggregator = new FinancialDataAggregatorService(prisma);
    this.aiRouter = aiRouter ?? new AiRouterService();
  }

  async generate(userId: string): Promise<{ insights: AdvisorInsight[]; generatedAt: string }> {
    const triggers = await this.evaluateRules(userId);
    const context = await this.aggregator.aggregate(userId);
    const insights: AdvisorInsight[] = [];

    for (const trigger of triggers) {
      let description = trigger.fact;
      let provider: AdvisorInsight["provider"];
      let model: string | undefined;

      try {
        const result = await this.aiRouter.generateText({
          system: ADVISOR_SYSTEM_PROMPT,
          prompt: `${context.markdown}\n\nGere um parágrafo curto (máx. 3 frases) explicando este insight para o usuário, sem inventar números além dos citados:\nTítulo: ${trigger.title}\nFato: ${trigger.fact}`,
          temperature: 0.3,
          maxTokens: 400,
        });
        description = result.text;
        provider = result.provider;
        model = result.model;
      } catch {
        /* mantém fact estático */
      }

      insights.push({
        id: trigger.id,
        ruleId: trigger.ruleId,
        title: trigger.title,
        severity: trigger.severity,
        description,
        provider,
        model,
      });
    }

    return { insights, generatedAt: new Date().toISOString() };
  }

  private async evaluateRules(userId: string): Promise<InsightTrigger[]> {
    const triggers: InsightTrigger[] = [];

    const liabilities = await this.prisma.patrimonyLiability.findMany({
      where: { userId, estaAtivo: true },
      select: { nome: true, saldoAtual: true, saldoOriginal: true },
    });

    const assets = await this.prisma.patrimonyAsset.findMany({
      where: { userId, estaAtivo: true },
      select: { valorAtual: true },
    });

    const totalAssets = assets.reduce((s, a) => s + Number(a.valorAtual), 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + Number(l.saldoAtual), 0);

    if (totalLiabilities > 0 && totalAssets > 0 && totalLiabilities / totalAssets > 0.6) {
      triggers.push({
        id: "liability-ratio",
        ruleId: "PASSIVOS_ELEVADOS",
        title: "Passivos elevados em relação ao patrimônio",
        severity: "warning",
        fact: `Passivos somam ${totalLiabilities.toFixed(2)} vs patrimônio em ativos ${totalAssets.toFixed(2)} (razão ${(totalLiabilities / totalAssets).toFixed(2)}).`,
      });
    }

    const cashflow = buildCashflowProjectionService(this.prisma);
    const projection = await cashflow.execute(userId);
    if (projection.previsao30Dias < 0) {
      triggers.push({
        id: "negative-cashflow-30",
        ruleId: "CAIXA_NEGATIVO_30D",
        title: "Caixa projetado negativo em 30 dias",
        severity: "critical",
        fact: `Previsão de caixa em 30 dias: ${projection.previsao30Dias.toFixed(2)} BRL.`,
      });
    }

    const criticalAlerts = projection.alertas.filter((a) => a.gravidade === "CRITICAL");
    for (const alert of criticalAlerts.slice(0, 2)) {
      triggers.push({
        id: `cf-alert-${alert.tipo}`,
        ruleId: alert.tipo,
        title: alert.tipo.replace(/_/g, " "),
        severity: "critical",
        fact: alert.mensagem,
      });
    }

    const consortiums = await this.prisma.consortium.findMany({
      where: { userId, estaAtivo: true },
      select: {
        nome: true,
        quantidadeParcelas: true,
        parcelasPagas: true,
        status: true,
      },
    });

    for (const c of consortiums) {
      const remaining = c.quantidadeParcelas - c.parcelasPagas;
      if (remaining > 0 && remaining <= 3) {
        triggers.push({
          id: `consortium-${c.nome}`,
          ruleId: "CONSORCIO_PROXIMO_QUITACAO",
          title: `Consórcio próximo da quitação: ${c.nome}`,
          severity: "info",
          fact: `Faltam ${remaining} parcela(s); status ${c.status}.`,
        });
      }
    }

    const installmentService = new InstallmentReadModelService(
      new PrismaInstallmentReadRepository(this.prisma),
    );
    const [summary, groups, commitments] = await Promise.all([
      installmentService.getSummary(userId),
      installmentService.listGroups(userId),
      installmentService.getFutureCommitments(userId),
    ]);

    if (summary.valorRestante > 0) {
      const byCard = new Map<string, number>();
      for (const g of groups) {
        if (g.status !== "ATIVO" || !g.cartao) continue;
        byCard.set(g.cartao, (byCard.get(g.cartao) ?? 0) + g.valorRestante);
      }
      for (const [cardName, amount] of byCard) {
        const pct = (amount / summary.valorRestante) * 100;
        if (pct >= 60) {
          triggers.push({
            id: `installment-card-${cardName}`,
            ruleId: "PARCELAMENTO_CONCENTRACAO_CARTAO",
            title: `Concentração de parcelamentos no cartão ${cardName}`,
            severity: "warning",
            fact: `O cartão concentra ${pct.toFixed(1)}% do valor restante em parcelamentos (R$ ${amount.toFixed(2)} de R$ ${summary.valorRestante.toFixed(2)}).`,
          });
          break;
        }
      }

      const month = await new MonthFinancialOverviewService(this.prisma).getCurrentMonth(userId);
      const receitaReferencia = month.receitas > 0 ? month.receitas : 0;
      const future30Total = commitments
        .filter((c) => {
          const d = new Date(`${c.data}T12:00:00.000Z`);
          const limit = new Date();
          limit.setUTCDate(limit.getUTCDate() + 30);
          return d.getTime() <= limit.getTime();
        })
        .reduce((s, c) => s + c.valor, 0);

      const safeCeiling = receitaReferencia > 0 ? receitaReferencia * 0.35 : 0;
      if (safeCeiling > 0 && future30Total > safeCeiling) {
        triggers.push({
          id: "installment-future-commitment",
          ruleId: "PARCELAMENTO_COMPROMETIMENTO_FUTURO",
          title: "Comprometimento futuro elevado com parcelamentos",
          severity: "warning",
          fact: `Parcelas em aberto nos próximos 30 dias somam R$ ${future30Total.toFixed(2)}, acima de 35% da receita do mês (R$ ${receitaReferencia.toFixed(2)}).`,
        });
      }

      for (const g of groups) {
        if (g.status === "ATIVO" && g.parcelasRestantes === 1) {
          triggers.push({
            id: `installment-last-${g.installmentGroup}`,
            ruleId: "PARCELAMENTO_FIM_CICLO",
            title: `Última parcela: ${g.descricao}`,
            severity: "info",
            fact: `Resta 1 parcela (R$ ${g.valorRestante.toFixed(2)})${g.cartao ? ` no cartão ${g.cartao}` : ""}.`,
          });
        }
      }
    }

    return triggers;
  }
}
