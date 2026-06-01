import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildRecurringUseCases } from "@/lib/api/recurring-use-cases";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { process } = buildRecurringUseCases();
  const result = await process.execute(session.user.id);

  return NextResponse.json(result);
}
