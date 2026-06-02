import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildCashflowProjectionService } from "@/modules/cashflow/application/services/cashflow-projection.service";
import type { CashFlowProjectionDTO } from "@/types/cashflow";

const responseSchema: z.ZodType<CashFlowProjectionDTO> = z.object({
  saldoAtual: z.number(),
  previsao7Dias: z.number(),
  previsao30Dias: z.number(),
  previsao60Dias: z.number(),
  previsao90Dias: z.number(),
  previsao180Dias: z.number(),
  previsao365Dias: z.number(),
  primeiraDataNegativa: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  eventos: z.array(
    z.object({
      id: z.string().min(1),
      data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      descricao: z.string().min(1),
      valor: z.number(),
      origem: z.enum([
        "RECEITA",
        "DESPESA",
        "RECORRENCIA",
        "FATURA",
        "FINANCIAMENTO",
        "CONSORCIO",
      ]),
    }),
  ),
  alertas: z.array(
    z.object({
      tipo: z.enum(["CAIXA_NEGATIVO", "CONCENTRACAO_DESPESAS", "EXCESSO_COMPROMISSOS"]),
      mensagem: z.string().min(1),
      gravidade: z.enum(["CRITICAL", "WARNING", "INFO"]),
    }),
  ),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const service = buildCashflowProjectionService(prisma);
  const projection = await service.execute(session.user.id);
  return NextResponse.json(responseSchema.parse(projection));
}

