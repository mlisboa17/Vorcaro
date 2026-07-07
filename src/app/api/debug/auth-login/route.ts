import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isAuthorized(request: Request): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("x-debug-secret") === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checks: Record<string, unknown> = {
    authSecret: Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
    authUrl: Boolean(process.env.AUTH_URL || process.env.NEXTAUTH_URL),
    authDevPassword: Boolean(process.env.AUTH_DEV_PASSWORD),
    databaseUrl: Boolean(process.env.DATABASE_URL),
    nodeEnv: process.env.NODE_ENV,
  };

  try {
    const user = await prisma.user.findUnique({
      where: { email: "mlisboa17@gmail.com" },
      select: { id: true, email: true, name: true },
    });

    return NextResponse.json({
      ok: true,
      checks,
      userFound: Boolean(user),
      user: user ? { id: user.id, email: user.email, name: user.name } : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        checks,
        errorName: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}