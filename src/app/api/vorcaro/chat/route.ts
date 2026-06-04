import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildVorcaroConversationService } from "@/lib/api/vorcaro-conversation";
import { vorcaroChatMessageBodySchema, vorcaroChatResponseSchema } from "@/types/vorcaro-conversation";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body !== null && typeof body === "object" && "userId" in body) {
    return NextResponse.json({ error: "userId not allowed in body" }, { status: 400 });
  }

  const parsed = vorcaroChatMessageBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const service = buildVorcaroConversationService();
  try {
    const result = await service.sendMessage({
      userId: session.user.id,
      message: parsed.data.message,
      channel: "WEB",
      conversationId: parsed.data.conversationId,
    });
    return NextResponse.json(vorcaroChatResponseSchema.parse(result));
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMIT_EXCEEDED") {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }
    if (error instanceof Error && error.message === "CONVERSATION_NOT_FOUND") {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    throw error;
  }
}
