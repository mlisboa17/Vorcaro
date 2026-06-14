import { getTenantPrisma } from "@/lib/prisma-tenant";

const MONTH_LABELS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", 
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

export interface ProjectionPoint {
  name: string; // Ex: "Jul/2026"
  year: number;
  month: number;
  saldoProjetado: number;
}

export async function getCashflowProjection(userId: string): Promise<ProjectionPoint[]> {
  const prisma = getTenantPrisma(userId);

  // 1. Busca o saldo inicial consolidado das contas
  const accounts = await prisma.financialAccount.findMany({
    where: { userId },
    select: { balance: true }
  });

  const baseBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

  // 2. Transações pendentes retroativas (vencidas antes de hoje mas não pagas)
  // Essas impactam imediatamente o saldo do mês 0 (hoje)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const retroactivePending = await prisma.transaction.findMany({
    where: {
      userId,
      dataCaixa: null,
      date: { lt: today }
    },
    select: { amount: true, type: true }
  });

  let adjustedStartingBalance = baseBalance;
  for (const tx of retroactivePending) {
    const val = Number(tx.amount);
    if (tx.type === "INCOME") adjustedStartingBalance += val;
    else if (tx.type === "EXPENSE") adjustedStartingBalance -= val;
  }

  // 3. Montar o escopo dos próximos 6 meses
  const projection: ProjectionPoint[] = [];
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  for (let i = 0; i < 6; i++) {
    const targetDate = new Date(currentYear, currentMonth + i, 1);
    projection.push({
      name: `${MONTH_LABELS[targetDate.getMonth()]}/${targetDate.getFullYear()}`,
      year: targetDate.getFullYear(),
      month: targetDate.getMonth(), // 0-11
      saldoProjetado: i === 0 ? adjustedStartingBalance : 0, // Apenas para inicializar a var
    });
  }

  // A data final da busca será o último dia do último mês projetado
  const lastMonthDate = new Date(currentYear, currentMonth + 5 + 1, 1);

  // 4. Buscar transações pendentes futuras (date >= hoje) e Recorrências Ativas
  const [futurePending, activeRecurrences] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        dataCaixa: null,
        date: {
          gte: today,
          lt: lastMonthDate
        }
      },
      select: { amount: true, type: true, date: true }
    }),
    prisma.lancamentoRecorrente.findMany({
      where: {
        userId,
        estaAtivo: true,
      },
      select: {
        valor: true,
        tipo: true,
        frequencia: true,
        proximaExecucao: true,
        dataFim: true
      }
    })
  ]);

  // 5. Agregar no array de meses (em memória)
  const monthlyFlows = new Map<string, number>();

  const addFlow = (date: Date, type: string, amount: number) => {
    if (date >= lastMonthDate) return; // Fora do escopo
    if (date < today) return; // Se for no passado, já foi computada retroativa via Transaction (se gerasse transação pendente). Se não, não projetamos.

    const txYear = date.getFullYear();
    const txMonth = date.getMonth();
    const key = `${txYear}-${txMonth}`;

    let val = Number(amount);
    if (type === "DESPESA" || type === "EXPENSE") val = -val;
    else if (type === "RECEITA" || type === "INCOME") val = val;
    else val = 0; // Outros tipos ignorados

    monthlyFlows.set(key, (monthlyFlows.get(key) ?? 0) + val);
  };

  for (const tx of futurePending) {
    addFlow(tx.date, tx.type, Number(tx.amount));
  }

  // 5.1 Desdobramento Cronológico das Recorrências
  for (const rec of activeRecurrences) {
    let cursor = new Date(rec.proximaExecucao);
    
    // Trava de segurança para não gerar loops infinitos bizarros caso proximaExecucao seja muito antiga (em teoria deveria estar atualizada)
    let safeGuard = 0;
    while (cursor < lastMonthDate && safeGuard < 300) {
      if (rec.dataFim && cursor > rec.dataFim) {
        break; // Atingiu o fim do contrato
      }

      // Projeta o lançamento
      addFlow(cursor, rec.tipo, Number(rec.valor));

      // Avança o cursor baseado na frequência
      const next = new Date(cursor);
      switch (rec.frequencia) {
        case "SEMANAL": next.setDate(next.getDate() + 7); break;
        case "QUINZENAL": next.setDate(next.getDate() + 15); break; // Convenção comercial
        case "MENSAL": next.setMonth(next.getMonth() + 1); break;
        case "BIMESTRAL": next.setMonth(next.getMonth() + 2); break;
        case "TRIMESTRAL": next.setMonth(next.getMonth() + 3); break;
        case "SEMESTRAL": next.setMonth(next.getMonth() + 6); break;
        case "ANUAL": next.setFullYear(next.getFullYear() + 1); break;
        default: next.setMonth(next.getMonth() + 1); break; // Fallback
      }
      cursor = next;
      safeGuard++;
    }
  }

  // 6. Computar o Saldo Cumulativo Linear
  let runningBalance = adjustedStartingBalance;
  
  for (let i = 0; i < projection.length; i++) {
    const pt = projection[i];
    const key = `${pt.year}-${pt.month}`;
    const netFlow = monthlyFlows.get(key) ?? 0;
    
    // O array tem saldo inicial em i=0. O fluxo do mês 0 (corrente a partir de hoje) é adicionado.
    runningBalance += netFlow;
    pt.saldoProjetado = runningBalance;
  }

  return projection;
}
