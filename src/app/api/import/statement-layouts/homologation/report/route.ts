import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jsonPath = join(process.cwd(), "scripts", "real-bank-homologation-results.json");
  const mdPath = join(process.cwd(), "docs", "real-bank-homologation-report.md");

  if (!existsSync(jsonPath)) {
    return NextResponse.json({ available: false });
  }

  try {
    const report = JSON.parse(readFileSync(jsonPath, "utf-8"));
    return NextResponse.json({
      available: true,
      report,
      markdownPath: existsSync(mdPath) ? "docs/real-bank-homologation-report.md" : null,
    });
  } catch {
    return NextResponse.json({ available: false, error: "invalid_report" });
  }
}
