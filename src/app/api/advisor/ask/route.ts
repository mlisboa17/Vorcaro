import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildFinancialAdvisorService } from "@/lib/api/financial-advisor";
import { advisorAskBodySchema, advisorAskResponseSchema } from "@/types/financial-advisor";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (body !== null && typeof body === "object" && "userId" in body) {
    return NextResponse.json({ error: "userId não permitido no corpo da requisição" }, { status: 400 });
  }

  const parsed = advisorAskBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pergunta inválida", details: parsed.error.flatten() }, { status: 400 });
  }

  const service = buildFinancialAdvisorService();
  const result = await service.ask(session.user.id, parsed.data.question);

  return NextResponse.json(advisorAskResponseSchema.parse(result));
}
