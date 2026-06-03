import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InboxLearningService } from "@/modules/inbox-intelligence/application/services/inbox-learning.service";

const bodySchema = z
  .object({
    description: z.string().min(1),
    suggestedCategoryId: z.string().min(1).nullable(),
    chosenCategoryId: z.string().min(1),
    chosenCategoryName: z.string().optional(),
  })
  .strict();

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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const learning = new InboxLearningService(prisma);
  const result = await learning.recordCategoryFeedback({
    userId: session.user.id,
    ...parsed.data,
  });

  return NextResponse.json(result);
}
