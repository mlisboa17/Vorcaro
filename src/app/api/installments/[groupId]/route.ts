import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildInstallmentReadModelService } from "@/lib/api/installments";
import { installmentGroupDetailSchema } from "@/types/installments";

type RouteContext = { params: Promise<{ groupId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { groupId: rawGroupId } = await context.params;
  const groupId = decodeURIComponent(rawGroupId).trim();
  if (!groupId) {
    return NextResponse.json({ error: "Grupo inválido" }, { status: 400 });
  }

  const service = buildInstallmentReadModelService();
  const forbidden = await service.isGroupForbiddenForUser(session.user.id, groupId);
  if (forbidden) {
    return NextResponse.json({ error: "Acesso negado a este grupo" }, { status: 403 });
  }

  const detail = await service.getGroupDetail(session.user.id, groupId);
  if (detail === null) {
    return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 });
  }

  const parsed = installmentGroupDetailSchema.safeParse(detail);
  if (!parsed.success) {
    return NextResponse.json({ error: "Resposta inválida" }, { status: 500 });
  }

  return NextResponse.json(parsed.data);
}
