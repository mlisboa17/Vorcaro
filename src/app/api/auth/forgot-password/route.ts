import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PasswordResetService } from "@/modules/auth/application/services/password-reset.service";

const schema = z.object({
  email: z.string().email(),
});

const GENERIC_MESSAGE =
  "Se o e-mail estiver cadastrado, você receberá instruções para redefinir a senha.";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const service = new PasswordResetService(prisma);
  const result = await service.requestReset(parsed.data.email);

  const payload: Record<string, string> = { message: GENERIC_MESSAGE };

  if (result.token && process.env.NODE_ENV !== "production") {
    payload.devResetToken = result.token;
  }

  return NextResponse.json(payload);
}
