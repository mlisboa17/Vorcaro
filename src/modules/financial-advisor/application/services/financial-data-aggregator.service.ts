import type { PrismaClient } from "@prisma/client";
import { buildCashflowProjectionService } from "@/modules/cashflow/application/services/cashflow-projection.service";
import { buildReceivableUseCases } from "@/lib/api/receivable-use-cases";
import { buildMonthlyCommitmentsUseCases } from "@/lib/api/monthly-commitments";
import { InstallmentReadModelService } from "@/modules/installments/application/services/installment-read-model.service";
import { PrismaInstallmentReadRepository } from "@/modules/installments/infrastructure/prisma-installment-read.repository";
import { FinancialPlanningService } from "@/modules/financial-planning/application/services/financial-planning.service";

export type AggregatedFinancialContext = {
  markdown: string;
  usedSources: string[];
  dataScore: number;
};

export class FinancialDataAggregatorService {
  constructor(private readonly prisma: PrismaClient) {}

  async aggregate(userId: string): Promise<AggregatedFinancialContext> {
    const usedSources: string[] = [];
    let dataScore = 0;

    const [
      accounts,
      cards,
      categories,
      recentTransactions,
      recurring,
      assets,
      liabilities,
      consortiums,
    ] = await Promise.all([
      this.prisma.financialAccount.findMany({
        where: { userId, isActive: true },
        select: { name: true, type: true, balance: true, currency: true },
        take: 20,
      }),
      this.prisma.card.findMany({
        where: { userId, isActive: true },
        select: { name: true, brand: true, type: true, creditLimit: true, closingDay: true, dueDay: true },
        take: 20,
      }),
      this.prisma.category.findMany({
        where: { userId, isActive: true },
        select: { name: true, type: true },
        take: 30,
      }),
      this.prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 40,
        select: {
          type: true,
          amount: true,
          description: true,
          date: true,
          dataCaixa: true,
        },
      }),
      this.prisma.lancamentoRecorrente.findMany({
        where: { userId, estaAtivo: true },
        select: {
          descricao: true,
          tipo: true,
          valor: true,
          frequencia: true,
          proximaExecucao: true,
        },
        take: 30,
      }),
      this.prisma.patrimonyAsset.findMany({
        where: { userId, estaAtivo: true },
        select: { nome: true, tipo: true, valorAtual: true, valorAquisicao: true },
        take: 20,
      }),
      this.prisma.patrimonyLiability.findMany({
        where: { userId, estaAtivo: true },
        select: { nome: true, tipo: true, saldoAtual: true, saldoOriginal: true },
        take: 20,
      }),
      this.prisma.consortium.findMany({
        where: { userId, estaAtivo: true },
        select: {
          nome: true,
          status: true,
          valorCredito: true,
          parcelasPagas: true,
          quantidadeParcelas: true,
          valorPago: true,
        },
        take: 10,
      }),
    ]);

    const sections: string[] = ["# Contexto financeiro do usuário (somente leitura)"];

    if (accounts.length > 0) {
      usedSources.push("contas");
      dataScore += 2;
      sections.push(
        "## Contas financeiras",
        ...accounts.map(
          (a) =>
            `- ${a.name} (${a.type}): saldo ${a.balance.toString()} ${a.currency}`,
        ),
      );
    }

    if (cards.length > 0) {
      usedSources.push("cartoes");
      dataScore += 1;
      sections.push(
        "## Cartões",
        ...cards.map(
          (c) =>
            `- ${c.name} ${c.brand}/${c.type}${c.creditLimit ? ` limite ${c.creditLimit}` : ""}`,
        ),
      );
    }

    if (categories.length > 0) {
      usedSources.push("categorias");
      dataScore += 1;
      sections.push(
        "## Categorias (amostra)",
        ...categories.slice(0, 15).map((c) => `- ${c.name} (${c.type})`),
      );
    }

    if (recentTransactions.length > 0) {
      usedSources.push("transacoes");
      dataScore += 3;
      sections.push(
        "## Transações recentes (até 40)",
        ...recentTransactions.map((t) => {
          const d = (t.dataCaixa ?? t.date).toISOString().slice(0, 10);
          return `- ${d} | ${t.type} | ${t.amount} | ${t.description}`;
        }),
      );
    }

    if (recurring.length > 0) {
      usedSources.push("recorrencias");
      dataScore += 2;
      sections.push(
        "## Lançamentos recorrentes ativos",
        ...recurring.map(
          (r) =>
            `- ${r.descricao} (${r.tipo}/${r.frequencia}): ${r.valor} próx. ${r.proximaExecucao.toISOString().slice(0, 10)}`,
        ),
      );
    }

    if (assets.length > 0) {
      usedSources.push("patrimonio_ativos");
      dataScore += 2;
      sections.push(
        "## Patrimônio — ativos",
        ...assets.map(
          (a) => `- ${a.nome} (${a.tipo}): atual ${a.valorAtual} aquisição ${a.valorAquisicao}`,
        ),
      );
    }

    if (liabilities.length > 0) {
      usedSources.push("patrimonio_passivos");
      dataScore += 2;
      sections.push(
        "## Patrimônio — passivos",
        ...liabilities.map(
          (l) => `- ${l.nome} (${l.tipo}): saldo ${l.saldoAtual} / original ${l.saldoOriginal}`,
        ),
      );
    }

    if (consortiums.length > 0) {
      usedSources.push("consorcios");
      dataScore += 1;
      sections.push(
        "## Consórcios",
        ...consortiums.map(
          (c) =>
            `- ${c.nome} [${c.status}]: crédito ${c.valorCredito}, parcelas ${c.parcelasPagas}/${c.quantidadeParcelas}, pago ${c.valorPago}`,
        ),
      );
    }

    try {
      const goals = await new FinancialPlanningService(this.prisma).getGoals(userId);
      const activeGoals = goals.filter((g) => g.status === "ACTIVE");
      if (activeGoals.length > 0) {
        usedSources.push("metas_planejamento");
        dataScore += 2;
        sections.push(
          "## Metas financeiras (planejamento)",
          ...activeGoals.map((g) => {
            const est = g.estrategia;
            const viab = g.viabilidade;
            const rec = g.recomendacao;
            return `- ${g.nome} (${g.tipo}, prioridade #${g.ordemPrioridade}): objetivo R$ ${g.valorObjetivo}, atual R$ ${g.valorAtual} (${est.percentualConcluido}%). Aporte: ${g.aporteMensal ?? est.aporteNecessario ?? "não definido"}. Viabilidade: ${viab.statusVisual} (risco ${viab.risco}, margem R$ ${viab.margemLivreMensal}, comprometimento ${viab.percentualComprometimento}%). Recomendação: ${rec.mensagem}`;
          }),
        );
      }
    } catch {
      /* metas opcionais */
    }

    try {
      const installmentService = new InstallmentReadModelService(
        new PrismaInstallmentReadRepository(this.prisma),
      );
      const [summary, groups] = await Promise.all([
        installmentService.getSummary(userId),
        installmentService.listGroups(userId),
      ]);

      if (groups.length > 0) {
        usedSources.push("parcelamentos");
        dataScore += 2;

        const yearEnd = new Date().getUTCFullYear();
        const endingThisYear = groups.filter(
          (g) => g.status === "ATIVO" && g.ultimaParcela.startsWith(String(yearEnd)),
        );

        const byCard = new Map<string, number>();
        for (const g of groups) {
          if (g.status !== "ATIVO" || !g.cartao) continue;
          byCard.set(g.cartao, (byCard.get(g.cartao) ?? 0) + g.valorRestante);
        }
        const topCard =
          [...byCard.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

        sections.push(
          "## Parcelamentos (compras parceladas — somente leitura)",
          `- Total parcelado (planos): R$ ${summary.parceladoTotal.toFixed(2)}`,
          `- Já pago: R$ ${summary.valorJaPago.toFixed(2)}`,
          `- Ainda devo (valor restante): R$ ${summary.valorRestante.toFixed(2)}`,
          `- Parcelas restantes (contagem): ${summary.parcelasRestantes}`,
          `- Planos ativos: ${summary.planosAtivos} · concluídos: ${summary.planosConcluidos}`,
          topCard
            ? `- Cartão com maior concentração de dívida parcelada: ${topCard[0]} (R$ ${topCard[1].toFixed(2)} restantes)`
            : "- Sem concentração por cartão identificada",
          endingThisYear.length > 0
            ? `- Planos que terminam ainda em ${yearEnd}: ${endingThisYear.map((g) => `${g.descricao} (${g.parcelasRestantes} parcela(s))`).join("; ")}`
            : `- Nenhum plano ativo com término previsto em ${yearEnd} nos dados atuais`,
          "### Planos ativos (amostra)",
          ...groups
            .filter((g) => g.status === "ATIVO")
            .slice(0, 12)
            .map(
              (g) =>
                `- ${g.descricao}${g.cartao ? ` [${g.cartao}]` : ""}: ${g.parcelasPagas}/${g.totalParcelas} pagas, restam R$ ${g.valorRestante.toFixed(2)}${g.parcelaAtual != null ? `, próxima parcela ${g.parcelaAtual}` : ""}`,
            ),
        );
      }
    } catch {
      /* parcelamentos opcionais */
    }

    try {
      const { getSummary } = buildReceivableUseCases();
      const receivableSummary = await getSummary.execute(userId);
      if (receivableSummary.totalPendente > 0) {
        usedSources.push("contas_a_receber");
        dataScore += 2;
        sections.push(
          "## Contas a receber",
          `- Total pendente: R$ ${receivableSummary.totalPendente.toFixed(2)}`,
          `- Total vencido: R$ ${receivableSummary.totalVencido.toFixed(2)}`,
          `- Em aberto: ${receivableSummary.countOpen} · parciais: ${receivableSummary.countPartial}`,
          "### Por devedor",
          ...receivableSummary.byDebtor.slice(0, 10).map(
            (row: { devedorNome: string; valorPendente: number }) =>
              `- ${row.devedorNome}: R$ ${row.valorPendente.toFixed(2)}`,
          ),
        );
      }
    } catch {
      /* contas a receber opcionais */
    }

    // Compromissos recorrentes (Sprint 8)
    try {
      const { getMonthly } = buildMonthlyCommitmentsUseCases();
      const commit = await getMonthly(userId, new Date().toISOString().slice(0, 7));
      if (commit.commitmentsCount > 0) {
        usedSources.push("compromissos_recorrentes");
        dataScore += 2;
        sections.push(
          "## Compromissos do mês",
          `- Saídas comprometidas: R$ ${commit.totalOutflows.toFixed(2)}`,
          `- Entradas previstas: R$ ${commit.totalInflows.toFixed(2)}`,
          `- Saldo líquido: R$ ${(commit.netCommitment * -1).toFixed(2)}`,
          `- Vencidos: ${commit.overdueCount}`,
          `- Itens nos próximos 7 dias: ${commit.next7DaysCount ?? 0}`,
          "### Por origem",
          ...commit.byOrigin.slice(0, 6).map(
            (o: { origin: string; total: number; count: number }) =>
              `- ${o.origin}: R$ ${o.total.toFixed(2)} (${o.count})`,
          ),
        );
      }
    } catch {
      /* compromissos opcionais */
    }

    try {
      const cashflow = buildCashflowProjectionService(this.prisma);
      const projection = await cashflow.execute(userId);
      if (projection.eventos.length > 0 || projection.previsao30Dias !== 0) {
        usedSources.push("fluxo_caixa");
        dataScore += 2;
        sections.push(
          "## Fluxo de caixa projetado",
          `- Saldo atual: ${projection.saldoAtual.toFixed(2)}`,
          `- Previsão 30d: ${projection.previsao30Dias.toFixed(2)}`,
          `- Alertas: ${projection.alertas.map((a) => `${a.tipo}: ${a.mensagem}`).join("; ") || "nenhum"}`,
          `- Próximos eventos (5):`,
          ...projection.eventos.slice(0, 5).map(
            (e) => `  - ${e.data} ${e.descricao}: ${e.valor.toFixed(2)} (${e.origem})`,
          ),
        );
      }
    } catch {
      /* fluxo opcional */
    }

    return {
      markdown: sections.join("\n"),
      usedSources,
      dataScore,
    };
  }
}
