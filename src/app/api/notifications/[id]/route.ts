import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { buildNotificationCenter } from "@/lib/api/notifications";

const patchSchema = z.object({
  action: z.enum(["read", "dismiss"]),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const center = buildNotificationCenter();
  const record =
    parsed.data.action === "read"
      ? await center.markRead(id, session.user.id)
      : await center.dismiss(id, session.user.id);

  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, status: record.status });
}
