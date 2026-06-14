"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Retorna o resumo agrupado de volume financeiro por empresa (Counterparty)
 * protegido por período (startDate, endDate) e isolado pelo Tenant atual.
 */
export async function getResumoPorEmpresa(startDate?: Date, endDate?: Date) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const whereDate: Prisma.TransactionWhereInput["date"] = {};
  if (startDate) whereDate.gte = startDate;
  if (endDate) whereDate.lte = endDate;

  // Busca todas as transações que possuem externalCounterpartyId (agrupando via aggregation ou em memória)
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      externalCounterpartyId: { not: null },
      ...(Object.keys(whereDate).length > 0 ? { date: whereDate } : {}),
      status: { not: "CANCELLED" }
    },
    select: {
      amount: true,
      type: true,
      externalCounterparty: {
        select: {
          id: true,
          name: true,
          cnpjCpf: true
        }
      }
    }
  });

  const summary = new Map<string, {
    empresaId: string;
    nome: string;
    documento: string | null;
    totalEntradas: number;
    totalSaidas: number;
    saldoVolume: number;
    qtdTransacoes: number;
  }>();

  for (const t of transactions) {
    if (!t.externalCounterparty) continue;
    const { id, name, cnpjCpf } = t.externalCounterparty;

    const current = summary.get(id) || {
      empresaId: id,
      nome: name,
      documento: cnpjCpf,
      totalEntradas: 0,
      totalSaidas: 0,
      saldoVolume: 0,
      qtdTransacoes: 0
    };

    const val = t.amount.toNumber();
    if (t.type === "INCOME") {
      current.totalEntradas += val;
      current.saldoVolume += val;
    } else {
      current.totalSaidas += Math.abs(val);
      current.saldoVolume -= Math.abs(val);
    }
    current.qtdTransacoes += 1;

    summary.set(id, current);
  }

  return Array.from(summary.values()).sort((a, b) => b.qtdTransacoes - a.qtdTransacoes);
}

/**
 * Retorna o total consolidado e a quantidade de transações de UMA empresa específica,
 * também protegido por período e restrito ao Tenant atual.
 */
export async function getTotalByEmpresa(empresaId: string, startDate?: Date, endDate?: Date) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const whereDate: Prisma.TransactionWhereInput["date"] = {};
  if (startDate) whereDate.gte = startDate;
  if (endDate) whereDate.lte = endDate;

  // Valida que a Counterparty pertence ao usuário (Isolamento Multitenant Absoluto)
  const counterparty = await prisma.counterparty.findUnique({
    where: { id: empresaId }
  });
  if (!counterparty || counterparty.userId !== userId) {
    throw new Error("Counterparty not found or unauthorized");
  }

  const aggregates = await prisma.transaction.groupBy({
    by: ['type'],
    where: {
      userId,
      externalCounterpartyId: empresaId,
      ...(Object.keys(whereDate).length > 0 ? { date: whereDate } : {}),
      status: { not: "CANCELLED" }
    },
    _sum: {
      amount: true
    },
    _count: {
      id: true
    }
  });

  let totalEntradas = 0;
  let totalSaidas = 0;
  let qtdTransacoes = 0;

  for (const agg of aggregates) {
    const sum = agg._sum.amount?.toNumber() || 0;
    if (agg.type === "INCOME") {
      totalEntradas += sum;
    } else {
      totalSaidas += Math.abs(sum);
    }
    qtdTransacoes += agg._count.id;
  }

  return {
    empresaId,
    totalEntradas,
    totalSaidas,
    saldoVolume: totalEntradas - totalSaidas,
    qtdTransacoes
  };
}

/**
 * Retorna a lista detalhada de transações de UMA empresa específica,
 * também protegido por período e restrito ao Tenant atual.
 */
export async function getTransacoesByEmpresa(empresaId: string, startDate?: Date, endDate?: Date) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const whereDate: Prisma.TransactionWhereInput["date"] = {};
  if (startDate) whereDate.gte = startDate;
  if (endDate) whereDate.lte = endDate;

  // Valida que a Counterparty pertence ao usuário (Isolamento Multitenant Absoluto)
  const counterparty = await prisma.counterparty.findUnique({
    where: { id: empresaId }
  });
  if (!counterparty || counterparty.userId !== userId) {
    throw new Error("Counterparty not found or unauthorized");
  }

  const transacoes = await prisma.transaction.findMany({
    where: {
      userId,
      externalCounterpartyId: empresaId,
      ...(Object.keys(whereDate).length > 0 ? { date: whereDate } : {})
    },
    orderBy: { date: "desc" },
    include: {
      category: { select: { id: true, name: true, color: true } },
      bankAccount: { select: { id: true, name: true, bankName: true } }
    }
  });

  return transacoes.map(t => ({
    ...t,
    amount: t.amount.toNumber()
  }));
}
