import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildVorcaroConversationService } from "@/lib/api/vorcaro-conversation";
import { vorcaroConversationSchema, vorcaroMessageSchema } from "@/types/vorcaro-conversation";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const service = buildVorcaroConversationService();
  const conversation = await service.getConversation(session.user.id, id);
  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const messages = await service.getMessages(session.user.id, id);
  return NextResponse.json({
    conversation: vorcaroConversationSchema.parse({
      ...conversation,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    }),
    messages: messages.map((m) =>
      vorcaroMessageSchema.parse({
        ...m,
        createdAt: m.createdAt.toISOString(),
      }),
    ),
  });
}
