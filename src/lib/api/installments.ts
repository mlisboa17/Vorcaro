import { prisma } from "@/lib/prisma";
import { InstallmentReadModelService } from "@/modules/installments/application/services/installment-read-model.service";
import { PrismaInstallmentReadRepository } from "@/modules/installments/infrastructure/prisma-installment-read.repository";

export function buildInstallmentReadModelService(): InstallmentReadModelService {
  return new InstallmentReadModelService(new PrismaInstallmentReadRepository(prisma));
}

/** Integração futura: Advisor / dashboard executivo. */
export async function getInstallmentSummaryForUser(userId: string) {
  return buildInstallmentReadModelService().getSummary(userId);
}

/** Integração futura: CashflowProjectionService. */
export async function getInstallmentFutureCommitmentsForUser(userId: string) {
  return buildInstallmentReadModelService().getFutureCommitments(userId);
}

export async function getInstallmentExecutiveSnapshotForUser(userId: string) {
  return buildInstallmentReadModelService().getExecutiveSnapshot(userId);
}
