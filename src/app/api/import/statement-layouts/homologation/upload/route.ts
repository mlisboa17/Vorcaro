import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { REAL_BANK_FORMAT_SLOTS } from "@/modules/statement-layout-training/homologation/real-bank/real-bank-homologation.types";

const BANKS_ROOT = join(process.cwd(), "homologation", "banks");
const ALLOWED_EXT = new Set([".pdf", ".ofx", ".csv", ".xls", ".xlsx"]);

function sanitizeFolder(name: string): string | null {
  if (!/^[A-Za-z0-9_]+$/.test(name)) return null;
  return name;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Upload local disponível apenas em desenvolvimento" }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Form inválido" }, { status: 400 });

  const bankFolder = sanitizeFolder(String(form.get("bankFolder") ?? ""));
  const file = form.get("file");
  if (!bankFolder) return NextResponse.json({ error: "Pasta de banco inválida" }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "Arquivo ausente" }, { status: 400 });

  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  if (!ALLOWED_EXT.has(ext)) {
    return NextResponse.json({ error: "Formato não permitido" }, { status: 400 });
  }

  const slotMatch = REAL_BANK_FORMAT_SLOTS.find((s) =>
    s.fileNames.some((n) => n.toLowerCase() === file.name.toLowerCase()),
  );
  const targetName = slotMatch?.fileNames[0] ?? file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

  const dir = join(BANKS_ROOT, bankFolder);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const dest = join(dir, targetName);
  writeFileSync(dest, buffer);

  return NextResponse.json({ ok: true, path: `homologation/banks/${bankFolder}/${targetName}` });
}
