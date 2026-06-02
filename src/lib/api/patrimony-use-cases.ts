import { prisma } from "@/lib/prisma";
import {
  CreatePatrimonyAssetUseCase,
  CreatePatrimonyLiabilityUseCase,
  DeletePatrimonyAssetUseCase,
  DeletePatrimonyLiabilityUseCase,
  GetPatrimonyAssetUseCase,
  GetPatrimonySummaryUseCase,
  ListPatrimonyAssetsUseCase,
  ListPatrimonyLiabilitiesUseCase,
  RegisterAssetValuationUseCase,
  RegisterConsortiumContemplationUseCase,
  RegisterConsortiumParcelUseCase,
  RegisterFinancingPaymentUseCase,
  RegisterInvestmentTransactionUseCase,
  UpdatePatrimonyAssetUseCase,
  UpdatePatrimonyLiabilityUseCase,
} from "@/modules/patrimony/application/use-cases/patrimony.use-cases";
import {
  PrismaPatrimonyAssetRepository,
  PrismaPatrimonyLiabilityRepository,
} from "@/modules/patrimony/infrastructure/repositories/prisma-patrimony.repositories";
import { PrismaPatrimonyUnitOfWork } from "@/modules/patrimony/infrastructure/repositories/prisma-patrimony-unit-of-work";

export function buildPatrimonyUseCases() {
  const assetRepository = new PrismaPatrimonyAssetRepository(prisma);
  const liabilityRepository = new PrismaPatrimonyLiabilityRepository(prisma);
  const unitOfWork = new PrismaPatrimonyUnitOfWork(prisma);

  return {
    assetRepository,
    liabilityRepository,
    listAssets: new ListPatrimonyAssetsUseCase(assetRepository),
    getAsset: new GetPatrimonyAssetUseCase(assetRepository),
    createAsset: new CreatePatrimonyAssetUseCase(assetRepository, liabilityRepository),
    updateAsset: new UpdatePatrimonyAssetUseCase(assetRepository, liabilityRepository),
    deleteAsset: new DeletePatrimonyAssetUseCase(assetRepository),
    listLiabilities: new ListPatrimonyLiabilitiesUseCase(liabilityRepository),
    createLiability: new CreatePatrimonyLiabilityUseCase(liabilityRepository),
    updateLiability: new UpdatePatrimonyLiabilityUseCase(liabilityRepository),
    deleteLiability: new DeletePatrimonyLiabilityUseCase(liabilityRepository),
    getSummary: new GetPatrimonySummaryUseCase(unitOfWork),
    registerInvestment: new RegisterInvestmentTransactionUseCase(unitOfWork),
    registerFinancingPayment: new RegisterFinancingPaymentUseCase(unitOfWork),
    registerConsortiumParcel: new RegisterConsortiumParcelUseCase(unitOfWork),
    registerConsortiumContemplation: new RegisterConsortiumContemplationUseCase(unitOfWork),
    registerAssetValuation: new RegisterAssetValuationUseCase(unitOfWork),
  };
}

export function parsePatrimonyDate(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`);
}
