import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  formatRealBankHomologMarkdown,
  runRealBankHomologation,
} from "@/modules/statement-layout-training/homologation/real-bank/real-bank-homologation.runner";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const report = await runRealBankHomologation(prisma, { userId, cleanup: false });

  const outJson = join(process.cwd(), "scripts", "real-bank-homologation-results.json");
  const outMd = join(process.cwd(), "docs", "real-bank-homologation-report.md");
  writeFileSync(outJson, JSON.stringify(report, null, 2), "utf8");
  writeFileSync(outMd, formatRealBankHomologMarkdown(report), "utf8");

  return NextResponse.json({ report, markdownPath: "docs/real-bank-homologation-report.md" });
}
