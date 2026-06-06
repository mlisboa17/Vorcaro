import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildFinancialDocumentServices } from "@/lib/api/financial-documents";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const { linesConfirm } = buildFinancialDocumentServices(prisma);
  const result = await linesConfirm.getLines(session.user.id, id);

  if (!result) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  }

  return NextResponse.json(result);
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    selectedLineIds?: string[];
    lines?: Array<Record<string, unknown>>;
    installmentActions?: Array<{
      purchaseId: string;
      createFutureInstallments: boolean;
      cardId?: string;
    }>;
    accountId?: string;
  } | null;

  if (!body?.selectedLineIds?.length && !body?.installmentActions?.length) {
    return NextResponse.json({ error: "Nenhuma linha selecionada" }, { status: 400 });
  }

  const { id } = await params;
  const { linesConfirm } = buildFinancialDocumentServices(prisma);

  try {
    const result = await linesConfirm.confirm(session.user.id, id, {
      selectedLineIds: body.selectedLineIds ?? [],
      lines: body.lines as never,
      installmentActions: body.installmentActions,
      accountId: body.accountId,
    });

    if (!result) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao confirmar linhas";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
