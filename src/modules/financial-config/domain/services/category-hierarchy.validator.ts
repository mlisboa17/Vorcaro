import { CategoryConfigError } from "../errors/category-config.error";
import type { CategoryConfigRepositoryPort } from "../ports/category-config.port";

export class CategoryHierarchyValidator {
  constructor(private readonly repository: CategoryConfigRepositoryPort) {}

  async validateCreate(input: { userId: string; parentCategoryId?: string | null }) {
    if (!input.parentCategoryId) {
      return;
    }

    const parent = await this.repository.findByIdForUser(
      input.parentCategoryId,
      input.userId,
    );

    if (!parent) {
      throw new CategoryConfigError("Categoria principal não encontrada.", "NOT_FOUND");
    }
  }
}
