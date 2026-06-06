import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildFinancialDocumentServices } from "@/lib/api/financial-documents";
import { prisma } from "@/lib/prisma";
import { FinancialDocumentProcessingError } from "@/modules/financial-documents/application/errors/financial-document-processing.error";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  if (!body?.password || typeof body.password !== "string") {
    return NextResponse.json({ error: "Informe a senha do PDF." }, { status: 400 });
  }

  const { id } = await params;
  const { password: passwordService } = buildFinancialDocumentServices(prisma);

  try {
    const result = await passwordService.submitPassword(session.user.id, id, body.password);
    const document = await prisma.financialDocument.findFirst({
      where: { id, userId: session.user.id },
    });

    if (result.status === "PASSWORD_REQUIRED") {
      return NextResponse.json(
        { error: "Documento protegido por senha.", processing: result },
        { status: 422 },
      );
    }

    if (result.status === "FAILED") {
      return NextResponse.json(
        { error: result.reason, code: result.code, processing: result, document },
        { status: 422 },
      );
    }

    return NextResponse.json({ document, processing: result });
  } catch (error) {
    if (error instanceof FinancialDocumentProcessingError) {
      const status = error.code === "PDF_INVALID_PASSWORD" ? 400 : 404;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json({ error: "Falha ao processar documento com senha." }, { status: 500 });
  }
}
