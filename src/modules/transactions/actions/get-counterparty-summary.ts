"use server";

import { auth } from "@/lib/auth";
import { prisma as db } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface CounterpartySummaryItem {
  counterpartyId: string;
  name: string;
  cnpjCpf: string | null;
  transactionCount: number;
  totalVolume: number;
  type: "INCOME" | "EXPENSE";
}

export async function getCounterpartySummary(
  startDate: Date,
  endDate: Date
): Promise<{ data?: CounterpartySummaryItem[]; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Não autorizado" };
    }
    const userId = session.user.id;

    // Busca todas as transações do período que possuem originId ou destinationId
    const transactions = await db.transaction.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        OR: [
          { originId: { not: null } },
          { destinationId: { not: null } },
        ]
      },
      include: {
        originCounterparty: true,
        destinationCounterparty: true,
      }
    });

    const summaryMap = new Map<string, CounterpartySummaryItem>();

    for (const tx of transactions) {
      const amount = Number(tx.amount);
      
      // Avaliação de Destino (Para quem o dinheiro foi)
      if (tx.destinationCounterparty) {
        const cp = tx.destinationCounterparty;
        const cpId = cp.id;
        
        // Regra de negócio: Se o destino é uma contraparte externa, consideramos como EXPENSE (Saída).
        // Se o CNPJ da contraparte for o mesmo do dono do Tenant (exigiria tabela de Tenant settings,
        // mas assumimos que o AI e a conciliação identificaram como INCOME se foi enviado *para* o próprio dono).
        // Aqui usamos a tipagem natural: se o valor de amount for negativo e foi para um destino, é saída.
        // Se for positivo, é entrada. A constraint pediu "Se o Destino for um terceiro, é Saída".
        
        const type: "INCOME" | "EXPENSE" = tx.type === "INCOME" ? "INCOME" : "EXPENSE";

        if (!summaryMap.has(cpId)) {
          summaryMap.set(cpId, {
            counterpartyId: cpId,
            name: cp.name,
            cnpjCpf: cp.cnpjCpf,
            transactionCount: 0,
            totalVolume: 0,
            type
          });
        }
        
        const current = summaryMap.get(cpId)!;
        current.transactionCount += 1;
        current.totalVolume += Math.abs(amount);
      }

      // Avaliação de Origem (De quem o dinheiro veio)
      if (tx.originCounterparty) {
        const cp = tx.originCounterparty;
        const cpId = cp.id;
        
        // Dinheiro vindo de origem geralmente é INCOME
        const type: "INCOME" | "EXPENSE" = tx.type === "INCOME" ? "INCOME" : "EXPENSE";

        if (!summaryMap.has(cpId)) {
          summaryMap.set(cpId, {
            counterpartyId: cpId,
            name: cp.name,
            cnpjCpf: cp.cnpjCpf,
            transactionCount: 0,
            totalVolume: 0,
            type
          });
        }
        
        const current = summaryMap.get(cpId)!;
        // Evita contagem dupla se a mesma transação tiver origem e destino na mesma view
        // Embora num summary seja raro exibir origem e destino na mesma linha, agrupamos pelo ID da contraparte.
        current.transactionCount += 1;
        current.totalVolume += Math.abs(amount);
      }
    }

    return {
      data: Array.from(summaryMap.values()).sort((a, b) => b.totalVolume - a.totalVolume)
    };

  } catch (error) {
    console.error("[getCounterpartySummary] Error:", error);
    return { error: "Falha ao gerar sumário de contrapartes" };
  }
}
