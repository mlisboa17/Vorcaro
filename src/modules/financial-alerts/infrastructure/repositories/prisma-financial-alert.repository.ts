import type {
  FinancialAlertSeverity,
  FinancialAlertStatus,
  FinancialAlertType,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import type {
  FinancialAlertListFilters,
  FinancialAlertRecord,
  FinancialAlertSummary,
  PaginatedAlerts,
} from "../../domain/types/financial-alert";

function mapRow(row: {
  id: string;
  userId: string;
  type: FinancialAlertType;
  severity: FinancialAlertSeverity;
  title: string;
  description: string;
  status: FinancialAlertStatus;
  fingerprint: string;
  metadata: Prisma.JsonValue;
  actionUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
}): FinancialAlertRecord {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type as FinancialAlertRecord["type"],
    severity: row.severity as FinancialAlertRecord["severity"],
    title: row.title,
    description: row.description,
    status: row.status as FinancialAlertRecord["status"],
    fingerprint: row.fingerprint,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : null,
    actionUrl: row.actionUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    resolvedAt: row.resolvedAt,
  };
}

export class PrismaFinancialAlertRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByFingerprint(userId: string, fingerprint: string): Promise<FinancialAlertRecord | null> {
    const row = await this.prisma.financialAlert.findUnique({
      where: { userId_fingerprint: { userId, fingerprint } },
    });
    return row ? mapRow(row) : null;
  }

  async upsertOpen(input: {
    userId: string;
    type: FinancialAlertType;
    severity: FinancialAlertSeverity;
    title: string;
    description: string;
    fingerprint: string;
    metadata?: Record<string, unknown>;
    actionUrl?: string | null;
  }): Promise<{ record: FinancialAlertRecord; created: boolean }> {
    const existing = await this.findByFingerprint(input.userId, input.fingerprint);

    if (existing?.status === "DISMISSED") {
      return { record: existing, created: false };
    }

    if (existing) {
      const row = await this.prisma.financialAlert.update({
        where: { id: existing.id },
        data: {
          type: input.type,
          severity: input.severity,
          title: input.title,
          description: input.description,
          status: "OPEN",
          metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
          actionUrl: input.actionUrl ?? null,
          resolvedAt: null,
        },
      });
      return { record: mapRow(row), created: false };
    }

    const row = await this.prisma.financialAlert.create({
      data: {
        userId: input.userId,
        type: input.type,
        severity: input.severity,
        title: input.title,
        description: input.description,
        fingerprint: input.fingerprint,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        actionUrl: input.actionUrl ?? null,
        status: "OPEN",
      },
    });
    return { record: mapRow(row), created: true };
  }

  async resolveByFingerprint(userId: string, fingerprint: string): Promise<boolean> {
    const existing = await this.findByFingerprint(userId, fingerprint);
    if (!existing || existing.status !== "OPEN") return false;

    await this.prisma.financialAlert.update({
      where: { id: existing.id },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    return true;
  }

  async list(
    userId: string,
    page: number,
    pageSize: number,
    filters: FinancialAlertListFilters,
  ): Promise<PaginatedAlerts<FinancialAlertRecord>> {
    const where: Prisma.FinancialAlertWhereInput = { userId };

    if (filters.status) where.status = filters.status;
    if (filters.severity) where.severity = filters.severity;
    if (filters.type) where.type = filters.type;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }
    if (filters.search?.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.financialAlert.count({ where }),
      this.prisma.financialAlert.findMany({
        where,
        orderBy: [{ status: "asc" }, { severity: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map(mapRow),
      total,
      page,
      pageSize,
    };
  }

  async getSummary(userId: string): Promise<FinancialAlertSummary> {
    const [openRows, resolvedCount, criticalOpen] = await Promise.all([
      this.prisma.financialAlert.findMany({
        where: { userId, status: "OPEN" },
        select: { severity: true, type: true },
      }),
      this.prisma.financialAlert.count({ where: { userId, status: "RESOLVED" } }),
      this.prisma.financialAlert.count({
        where: { userId, status: "OPEN", severity: "CRITICAL" },
      }),
    ]);

    const bySeverity: FinancialAlertSummary["bySeverity"] = {
      INFO: 0,
      WARNING: 0,
      CRITICAL: 0,
    };
    const byType: Record<string, number> = {};

    for (const row of openRows) {
      bySeverity[row.severity as keyof typeof bySeverity] += 1;
      byType[row.type] = (byType[row.type] ?? 0) + 1;
    }

    return {
      totalOpen: openRows.length,
      totalResolved: resolvedCount,
      totalCritical: criticalOpen,
      bySeverity,
      byType,
    };
  }

  async findById(userId: string, id: string): Promise<FinancialAlertRecord | null> {
    const row = await this.prisma.financialAlert.findFirst({ where: { id, userId } });
    return row ? mapRow(row) : null;
  }

  async patch(
    userId: string,
    id: string,
    data: { status: FinancialAlertStatus },
  ): Promise<FinancialAlertRecord | null> {
    const existing = await this.findById(userId, id);
    if (!existing) return null;

    const row = await this.prisma.financialAlert.update({
      where: { id },
      data: {
        status: data.status,
        resolvedAt: data.status === "RESOLVED" ? new Date() : null,
      },
    });
    return mapRow(row);
  }

  async bulkPatch(
    userId: string,
    ids: string[],
    status: FinancialAlertStatus,
  ): Promise<number> {
    const result = await this.prisma.financialAlert.updateMany({
      where: { userId, id: { in: ids } },
      data: {
        status,
        resolvedAt: status === "RESOLVED" ? new Date() : null,
      },
    });
    return result.count;
  }

  async listOpenFingerprintsByTypes(
    userId: string,
    types: FinancialAlertType[],
  ): Promise<Array<{ fingerprint: string; type: FinancialAlertType }>> {
    const rows = await this.prisma.financialAlert.findMany({
      where: { userId, status: "OPEN", type: { in: types } },
      select: { fingerprint: true, type: true },
    });
    return rows;
  }
}
