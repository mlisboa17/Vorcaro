import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { generateWeeklySummaryCsv } from "@/lib/telegram/weekly-summary-export";
import { WeeklySummaryService } from "@/modules/reports/application/services/weekly-summary.service";

const prisma = new PrismaClient();

export const GET = async (req: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(req.url);
    const daysParam = searchParams.get("days");
    const sinceDays = daysParam ? Number(daysParam) : 7;

    const summary = await new WeeklySummaryService(prisma).build(userId, sinceDays);
    const csvContent = generateWeeklySummaryCsv(summary);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="resumo_financeiro_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("[reports/transactions.csv] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate CSV" },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
};
