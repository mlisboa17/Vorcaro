"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type WebhookLogDto = {
  id: string;
  provider: string;
  eventId: string | null;
  status: string;
  createdAt: Date;
};

export async function getWebhookLogs(): Promise<WebhookLogDto[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const logs = await prisma.webhookLog.findMany({
    where: { tenantId: session.user.id },
    take: 10,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      provider: true,
      eventId: true,
      status: true,
      createdAt: true,
    },
  });

  return logs;
}
