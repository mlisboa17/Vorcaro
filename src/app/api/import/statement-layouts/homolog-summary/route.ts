import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jsonPath = join(process.cwd(), "scripts", "statement-layout-training-homologation-results.json");
  if (!existsSync(jsonPath)) {
    return NextResponse.json({ available: false });
  }

  try {
    const raw = JSON.parse(readFileSync(jsonPath, "utf-8")) as {
      generatedAt?: string;
      summary?: { total: number; passed: number; failed: number; ready: boolean };
    };
    return NextResponse.json({
      available: true,
      generatedAt: raw.generatedAt ?? null,
      summary: raw.summary ?? null,
      reportPath: "docs/statement-layout-training-homologation-report.md",
    });
  } catch {
    return NextResponse.json({ available: false, error: "invalid_report" });
  }
}
