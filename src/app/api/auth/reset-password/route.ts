import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PasswordResetService } from "@/modules/auth/application/services/password-reset.service";

const schema = z.object({
  token: z.string().min(32),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
});

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
  const ok = await service.resetPassword(parsed.data.token, parsed.data.password);

  if (!ok) {
    return NextResponse.json(
      { error: "Token inválido ou expirado." },
      { status: 404 },
    );
  }

  return NextResponse.json({ message: "Senha redefinida com sucesso." });
}
