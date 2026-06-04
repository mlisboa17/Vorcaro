import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { buildNotificationPreferences } from "@/lib/api/notifications";
import { NOTIFICATION_TYPES } from "@/modules/notifications/domain/types/notification";

const patchSchema = z.object({
  notificationType: z.enum(NOTIFICATION_TYPES),
  dashboardEnabled: z.boolean().optional(),
  telegramEnabled: z.boolean().optional(),
  digestEnabled: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prefs = buildNotificationPreferences();
  const items = await prefs.findByUserId(session.user.id);
  return NextResponse.json({ items });
}

export async function PATCH(request: Request) {
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

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const prefs = buildNotificationPreferences();
  const updated = await prefs.update(session.user.id, parsed.data.notificationType, {
    dashboardEnabled: parsed.data.dashboardEnabled,
    telegramEnabled: parsed.data.telegramEnabled,
    digestEnabled: parsed.data.digestEnabled,
  });

  return NextResponse.json(updated);
}
