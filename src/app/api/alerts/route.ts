import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FinancialAlertQueryService } from "@/modules/financial-alerts/application/services/financial-alert-query.service";
import type {
  FinancialAlertSeverity,
  FinancialAlertStatus,
  FinancialAlertType,
} from "@/modules/financial-alerts/domain/types/financial-alert";
import { serializeFinancialAlert } from "@/types/financial-alerts";

function parsePage(value: string | null, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parsePage(searchParams.get("page"), 1);
  const pageSize = Math.min(parsePage(searchParams.get("pageSize"), 20), 100);
  const status = searchParams.get("status") as FinancialAlertStatus | null;
  const severity = searchParams.get("severity") as FinancialAlertSeverity | null;
  const type = searchParams.get("type") as FinancialAlertType | null;
  const search = searchParams.get("search");
  const date = searchParams.get("date");

  let dateFrom: Date | undefined;
  let dateTo: Date | undefined;
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    dateFrom = new Date(`${date}T00:00:00.000Z`);
    dateTo = new Date(`${date}T23:59:59.999Z`);
  }

  const service = new FinancialAlertQueryService(prisma);
  const result = await service.list(session.user.id, page, pageSize, {
    status: status ?? undefined,
    severity: severity ?? undefined,
    type: type ?? undefined,
    search: search ?? undefined,
    dateFrom,
    dateTo,
  });

  return NextResponse.json({
    items: result.items.map(serializeFinancialAlert),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  });
}
