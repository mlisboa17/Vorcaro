import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildNotificationQuery } from "@/lib/api/notifications";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = buildNotificationQuery();
  const summary = await query.getSummary(session.user.id);
  return NextResponse.json(summary);
}
