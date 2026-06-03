import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildMonthlyCommitmentsUseCases } from "@/lib/api/monthly-commitments";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const url = new URL(request.url);
  const month = url.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);

  try {
    const { getMonthly } = buildMonthlyCommitmentsUseCases();
    const payload = await getMonthly(session.user.id, month);
    return NextResponse.json(payload);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

