import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildPatrimonyUseCases, parsePatrimonyDate } from "@/lib/api/patrimony-use-cases";
import { financingPaymentSchema } from "@/lib/patrimony/patrimony-schemas";
import {
  serializeAccountingImpact,
  serializePatrimonyLiability,
} from "@/lib/patrimony/serialize-patrimony";
import { PatrimonyError } from "@/modules/patrimony/domain/errors/patrimony.error";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = financingPaymentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { registerFinancingPayment } = buildPatrimonyUseCases();

  try {
    const result = await registerFinancingPayment.execute({
      userId: session.user.id,
      liabilityId: parsed.data.liabilityId,
      data: parsePatrimonyDate(parsed.data.data),
      descricao: parsed.data.descricao,
      amortizacao: parsed.data.amortizacao,
      juros: parsed.data.juros,
      seguro: parsed.data.seguro,
      taxa: parsed.data.taxa,
      mainTransactionId: parsed.data.mainTransactionId,
    });

    return NextResponse.json({
      liability: serializePatrimonyLiability(result.liability),
      impact: serializeAccountingImpact(result.impact),
    });
  } catch (error) {
    if (error instanceof PatrimonyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
