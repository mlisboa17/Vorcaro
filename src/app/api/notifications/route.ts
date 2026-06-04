import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  buildNotificationCenter,
  buildNotificationQuery,
} from "@/lib/api/notifications";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_SEVERITIES,
  NOTIFICATION_STATUSES,
  NOTIFICATION_TYPES,
} from "@/modules/notifications/domain/types/notification";
import type { NotificationListResponse } from "@/types/notifications";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum([...NOTIFICATION_STATUSES, "UNREAD", "ALL"] as const).optional(),
  type: z.enum(NOTIFICATION_TYPES).optional(),
  channel: z.enum(NOTIFICATION_CHANNELS).optional(),
  severity: z.enum(NOTIFICATION_SEVERITIES).optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const query = buildNotificationQuery();

  let status: (typeof NOTIFICATION_STATUSES)[number] | (typeof NOTIFICATION_STATUSES)[number][] | undefined;
  if (parsed.data.status === "UNREAD") {
    status = ["PENDING", "SENT"];
  } else if (parsed.data.status && parsed.data.status !== "ALL") {
    status = parsed.data.status;
  }

  const result = await query.list({
    userId: session.user.id,
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
    status,
    type: parsed.data.type,
    channel: parsed.data.channel ?? "DASHBOARD",
    severity: parsed.data.severity,
  });

  const response: NotificationListResponse = {
    items: result.items.map((item) => ({
      id: item.id,
      type: item.type,
      severity: item.severity,
      status: item.status,
      title: item.title,
      message: item.message,
      channel: item.channel,
      createdAt: item.createdAt.toISOString(),
      sentAt: item.sentAt?.toISOString() ?? null,
      readAt: item.readAt?.toISOString() ?? null,
      actionUrl:
        typeof item.payload?.actionUrl === "string" ? item.payload.actionUrl : null,
    })),
    total: result.total,
    page: parsed.data.page ?? 1,
    pageSize: parsed.data.pageSize ?? 20,
  };

  return NextResponse.json(response);
}
