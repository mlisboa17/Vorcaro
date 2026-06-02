import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildPatrimonyUseCases } from "@/lib/api/patrimony-use-cases";
import { serializePatrimonySummary } from "@/lib/patrimony/serialize-patrimony";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { getSummary } = buildPatrimonyUseCases();
  const summary = await getSummary.execute(session.user.id);

  return NextResponse.json(serializePatrimonySummary(summary));
}
