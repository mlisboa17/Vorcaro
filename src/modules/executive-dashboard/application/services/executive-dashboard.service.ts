import { buildConsortiumAlerts } from "@/lib/consortium/consortium-domain";
import type { CashflowProjectionService } from "@/modules/cashflow/application/services/cashflow-projection.service";
import type { BudgetOverviewPort } from "@/modules/budget/domain/ports/budget-overview.port";
import type { ConsortiumService } from "@/modules/consortium/application/consortium.service";
import type { PatrimonyUnitOfWorkPort } from "@/modules/patrimony/domain/ports/patrimony.port";
import type { ExecutiveDashboardDTO } from "@/types/executive-dashboard";
import type { MonthFinancialOverviewService } from "./month-financial-overview.service";

export class ExecutiveDashboardService {
  constructor(
    private readonly cashflowProjection: CashflowProjectionService,
    private readonly patrimonyUnitOfWork: PatrimonyUnitOfWorkPort,
    private readonly budgetOverview: BudgetOverviewPort,
    private readonly monthOverview: MonthFinancialOverviewService,
    private readonly consortiumService: ConsortiumService,
  ) {}

  async execute(userId: string): Promise<ExecutiveDashboardDTO> {
    const [projection, patrimony, budget, month, consortium, consortiumRows] = await Promise.all([
      this.cashflowProjection.execute(userId),
      this.patrimonyUnitOfWork.getSummary(userId),
      this.budgetOverview.getOverview(userId),
      this.monthOverview.getCurrentMonth(userId),
      this.consortiumService.getExecutiveSummary(userId),
      this.consortiumService.list(userId),
    ]);

    const alerts = [
      ...projection.alertas.map((alert) => ({
        type: alert.tipo,
        severity: alert.gravidade,
        message: alert.mensagem,
      })),
      ...this.buildBudgetAlerts(budget),
      ...this.buildPatrimonyAlerts(patrimony),
      ...buildConsortiumAlerts(consortiumRows),
    ];

    return {
      cash: {
        saldoAtual: projection.saldoAtual,
        saldoProjetado30Dias: projection.previsao30Dias,
        saldoProjetado90Dias: projection.previsao90Dias,
        primeiraDataNegativa: projection.primeiraDataNegativa,
      },
      month,
      budget: {
        totalPlanejado: budget.totalPlanejado,
        totalRealizadoDre: budget.totalRealizadoDre,
        restante: budget.restante,
        categoriasEstouradas: budget.categoriasEstouradas,
        categoriasAtencao: budget.categoriasAtencao,
      },
      patrimony: {
        totalAtivos: patrimony.totalAtivos,
        totalPassivos: patrimony.totalPassivos,
        patrimonioLiquido: patrimony.patrimonioLiquido,
      },
      consortium,
      alerts,
    };
  }

  private buildBudgetAlerts(budget: Awaited<ReturnType<BudgetOverviewPort["getOverview"]>>) {
    const alerts: ExecutiveDashboardDTO["alerts"] = [];

    if (budget.categoriasEstouradas > 0) {
      alerts.push({
        type: "ORCAMENTO_ESTOURADO",
        severity: "CRITICAL",
        message: `${budget.categoriasEstouradas} categoria(s) de despesa ultrapassaram o planejado no mês.`,
      });
    } else if (budget.categoriasAtencao > 0) {
      alerts.push({
        type: "ORCAMENTO_ATENCAO",
        severity: "WARNING",
        message: `${budget.categoriasAtencao} categoria(s) estão acima de 80% do orçamento planejado.`,
      });
    }

    if (budget.restante < 0) {
      alerts.push({
        type: "ORCAMENTO_GLOBAL_ESTOURADO",
        severity: "WARNING",
        message: "O realizado DRE do mês superou o total planejado com base em recorrências.",
      });
    }

    return alerts;
  }

  private buildPatrimonyAlerts(
    patrimony: Awaited<ReturnType<PatrimonyUnitOfWorkPort["getSummary"]>>,
  ) {
    if (patrimony.patrimonioLiquido >= 0) {
      return [];
    }

    return [
      {
        type: "PATRIMONIO_NEGATIVO",
        severity: "CRITICAL" as const,
        message: "Seu patrimônio líquido está negativo. Revise passivos e ativos.",
      },
    ];
  }
}
