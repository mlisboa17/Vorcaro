import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isVorcaroAdminEmail } from "@/lib/auth/is-vorcaro-admin";
import { vorcaroIntentObservability } from "@/modules/vorcaro/intent/application/services/vorcaro-intent-observability.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (!isVorcaroAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
  }

  return NextResponse.json({
    metrics: vorcaroIntentObservability.snapshot(),
    lastDiagnostic: vorcaroIntentObservability.lastSelfCorrectionDiagnostic(),
  });
}
