import { CategoryConfigError } from "../../domain/errors/category-config.error";
import type {
  CategoryConfigRepositoryPort,
  CreateCategoryConfigInput,
  UpdateCategoryConfigInput,
} from "../../domain/ports/category-config.port";
import { CategoryHierarchyValidator } from "../../domain/services/category-hierarchy.validator";

export class ListCategoriesConfigUseCase {
  constructor(private readonly repository: CategoryConfigRepositoryPort) {}

  execute(userId: string) {
    return this.repository.listTreeByUserId(userId);
  }
}

export class CreateCategoryConfigUseCase {
  private readonly hierarchyValidator: CategoryHierarchyValidator;

  constructor(private readonly repository: CategoryConfigRepositoryPort) {
    this.hierarchyValidator = new CategoryHierarchyValidator(repository);
  }

  async execute(input: CreateCategoryConfigInput) {
    await this.hierarchyValidator.validateCreate({
      userId: input.userId,
      parentCategoryId: input.parentCategoryId,
    });

    if (input.parentCategoryId) {
      const parent = await this.repository.findByIdForUser(
        input.parentCategoryId,
        input.userId,
      );

      if (parent && parent.type !== input.type) {
        throw new CategoryConfigError(
          "A subcategoria deve ter o mesmo tipo da categoria principal.",
          "VALIDATION",
        );
      }
    }

    return this.repository.create(input);
  }
}

export class UpdateCategoryConfigUseCase {
  constructor(private readonly repository: CategoryConfigRepositoryPort) {}

  async execute(categoryId: string, userId: string, input: UpdateCategoryConfigInput) {
    const existing = await this.repository.findByIdForUser(categoryId, userId);

    if (!existing) {
      throw new CategoryConfigError("Categoria não encontrada.", "NOT_FOUND");
    }

    const updated = await this.repository.update(categoryId, userId, input);

    if (!updated) {
      throw new CategoryConfigError("Categoria não encontrada.", "NOT_FOUND");
    }

    return updated;
  }
}
