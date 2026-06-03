import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildInstallmentReadModelService } from "@/lib/api/installments";
import { installmentGroupListSchema } from "@/types/installments";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const groups = await buildInstallmentReadModelService().listGroups(session.user.id);
  const parsed = installmentGroupListSchema.safeParse(groups);
  if (!parsed.success) {
    return NextResponse.json({ error: "Resposta inválida" }, { status: 500 });
  }

  return NextResponse.json(parsed.data);
}
