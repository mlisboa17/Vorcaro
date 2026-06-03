import type { PrismaClient } from "@prisma/client";
import type {
  FinancialAlertListFilters,
  FinancialAlertStatus,
} from "../../domain/types/financial-alert";
import { PrismaFinancialAlertRepository } from "../../infrastructure/repositories/prisma-financial-alert.repository";

export class FinancialAlertQueryService {
  private readonly repo: PrismaFinancialAlertRepository;

  constructor(prisma: PrismaClient) {
    this.repo = new PrismaFinancialAlertRepository(prisma);
  }

  list(userId: string, page: number, pageSize: number, filters: FinancialAlertListFilters) {
    return this.repo.list(userId, page, pageSize, filters);
  }

  summary(userId: string) {
    return this.repo.getSummary(userId);
  }

  patch(userId: string, id: string, status: FinancialAlertStatus) {
    return this.repo.patch(userId, id, { status });
  }

  bulkPatch(userId: string, ids: string[], status: FinancialAlertStatus) {
    return this.repo.bulkPatch(userId, ids, status);
  }
}
