import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InboxIntelligenceMetricsService } from "@/modules/inbox-intelligence/application/services/inbox-intelligence-metrics.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const service = new InboxIntelligenceMetricsService(prisma);
  const metrics = await service.getMetrics(session.user.id);

  const highConfidenceReadyCount = await prisma.financialInbox.count({
    where: {
      userId: session.user.id,
      status: { in: ["READY", "NEEDS_CONFIRMATION"] },
    },
  });

  return NextResponse.json({
    ...metrics,
    highConfidenceReadyCount,
  });
}
