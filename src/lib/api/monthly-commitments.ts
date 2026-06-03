import { MonthlyCommitmentsService } from "@/modules/commitments/application/services/monthly-commitments.service";

export function buildMonthlyCommitmentsUseCases() {
  const service = new MonthlyCommitmentsService();
  return {
    service,
    getMonthly: (userId: string, month: string) => service.execute(userId, month),
  };
}

