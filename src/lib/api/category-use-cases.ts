import { prisma } from "@/lib/prisma";
import {
  DeleteCategoryConfigUseCase,
  UpdateCategoryConfigUseCase,
} from "@/modules/financial-config/application/use-cases/category-config.use-cases";
import { PrismaCategoryConfigRepository } from "@/modules/financial-config/infrastructure/repositories/prisma-category-config.repository";

export function buildCategoryConfigUseCases() {
  const repository = new PrismaCategoryConfigRepository(prisma);

  return {
    update: new UpdateCategoryConfigUseCase(repository),
    remove: new DeleteCategoryConfigUseCase(repository),
    repository,
  };
}
