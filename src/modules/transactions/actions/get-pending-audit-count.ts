"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getPendingAuditCount(): Promise<number> {
  const session = await auth();
  
  if (!session?.user?.id) {
    return 0;
  }

  try {
    // Busca focada usando a capacidade JSON do Prisma para garantir < 2ms (index usage on Postgres JSONB)
    const count = await prisma.transaction.count({
      where: {
        userId: session.user.id,
        metadata: {
          path: ['reviewRequired'],
          equals: true,
        }
      }
    });

    return count;
  } catch (error) {
    console.error("[getPendingAuditCount] Falha ao contar auditorias pendentes", error);
    return 0;
  }
}
