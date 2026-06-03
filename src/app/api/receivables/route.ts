import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { buildReceivableUseCases, parseReceivableDate } from "@/lib/api/receivable-use-cases";
import { ReceivableError } from "@/modules/receivables/domain/errors/receivable.error";
import { serializeReceivable, serializeReceivableSummary } from "@/types/receivables";

function handleError(error: unknown) {
  if (error instanceof ReceivableError) {
    const status =
      error.code === "NOT_FOUND" ? 404 : error.code === "VALIDATION" ? 400 : 422;
    return NextResponse.json({ error: error.message }, { status });
  }
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ error: "Erro interno" }, { status: 500 });
}

const createSchema = z.object({
  descricao: z.string().min(1),
  devedorNome: z.string().min(1),
  valorOriginal: z.number().positive(),
  origem: z.string().optional(),
  observacoes: z.string().optional(),
  expectedDate: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const summaryOnly = searchParams.get("summary") === "1";
  const { list, getSummary } = buildReceivableUseCases();

  try {
    if (summaryOnly) {
      const summary = await getSummary.execute(session.user.id);
      return NextResponse.json({ summary: serializeReceivableSummary(summary) });
    }

    const includeCancelled = searchParams.get("includeCancelled") === "1";
    const items = await list.execute(session.user.id, includeCancelled);
    const summary = await getSummary.execute(session.user.id);

    return NextResponse.json({
      items: items.map(serializeReceivable),
      summary: serializeReceivableSummary(summary),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = createSchema.parse(await request.json());
    const { create } = buildReceivableUseCases();
    const receivable = await create.execute({
      userId: session.user.id,
      descricao: body.descricao,
      devedorNome: body.devedorNome,
      valorOriginal: body.valorOriginal,
      origem: body.origem ?? "MANUAL",
      observacoes: body.observacoes ?? null,
      expectedDate: body.expectedDate ? parseReceivableDate(body.expectedDate) : null,
    });

    return NextResponse.json(serializeReceivable(receivable), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return handleError(error);
  }
}
