import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildVorcaroConversationService } from "@/lib/api/vorcaro-conversation";
import { vorcaroConversationSchema, vorcaroMessageSchema } from "@/types/vorcaro-conversation";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = buildVorcaroConversationService();
  const items = await service.listConversations(session.user.id);
  return NextResponse.json({
    items: items.map((c) =>
      vorcaroConversationSchema.parse({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      }),
    ),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let title: string | undefined;
  try {
    const body = (await request.json()) as { title?: string };
    title = body.title;
  } catch {
    /* optional body */
  }

  const service = buildVorcaroConversationService();
  const conversation = await service.createConversation(session.user.id, "WEB", title);
  return NextResponse.json(
    vorcaroConversationSchema.parse({
      ...conversation,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    }),
  );
}
