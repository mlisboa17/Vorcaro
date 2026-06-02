import type { PrismaClient } from "@prisma/client";
import type {
  CategoryConfigRecord,
  CategoryConfigRepositoryPort,
  CategoryTreeNode,
  CreateCategoryConfigInput,
  UpdateCategoryConfigInput,
} from "../../domain/ports/category-config.port";

function toRecord(record: {
  id: string;
  userId: string;
  name: string;
  type: CategoryConfigRecord["type"];
  icon: string | null;
  color: string | null;
  isSystem: boolean;
  isActive: boolean;
  parentCategoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CategoryConfigRecord {
  return record;
}

export class PrismaCategoryConfigRepository implements CategoryConfigRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  async listTreeByUserId(userId: string, options?: { includeInactive?: boolean }): Promise<CategoryTreeNode[]> {
    const includeInactive = options?.includeInactive ?? false;
    const roots = await this.db.category.findMany({
      where: {
        userId,
        parentCategoryId: null,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { name: "asc" },
      include: {
        subcategories: {
          where: includeInactive ? {} : { isActive: true },
          orderBy: { name: "asc" },
        },
      },
    });

    return roots.map((root) => ({
      ...toRecord(root),
      subcategories: root.subcategories.map(toRecord),
    }));
  }

  async listAllActiveByUserId(userId: string): Promise<CategoryConfigRecord[]> {
    const records = await this.db.category.findMany({
      where: { userId, isActive: true },
      orderBy: [{ parentCategoryId: "asc" }, { name: "asc" }],
    });

    return records.map(toRecord);
  }

  async findByIdForUser(
    categoryId: string,
    userId: string,
  ): Promise<CategoryConfigRecord | null> {
    const record = await this.db.category.findFirst({
      where: { id: categoryId, userId },
    });

    return record ? toRecord(record) : null;
  }

  async create(input: CreateCategoryConfigInput): Promise<CategoryConfigRecord> {
    const record = await this.db.category.create({
      data: {
        userId: input.userId,
        name: input.name,
        type: input.type,
        parentCategoryId: input.parentCategoryId ?? null,
        isActive: true,
      },
    });

    return toRecord(record);
  }

  async update(
    categoryId: string,
    userId: string,
    input: UpdateCategoryConfigInput,
  ): Promise<CategoryConfigRecord | null> {
    const existing = await this.findByIdForUser(categoryId, userId);

    if (!existing) {
      return null;
    }

    const record = await this.db.category.update({
      where: { id: categoryId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    return toRecord(record);
  }

  async belongsToUser(categoryId: string, userId: string): Promise<boolean> {
    const category = await this.db.category.findFirst({
      where: { id: categoryId, userId },
      select: { id: true },
    });

    return category !== null;
  }

  async countUsage(categoryId: string): Promise<number> {
    const [transactions, recurring] = await Promise.all([
      this.db.transaction.count({ where: { categoryId } }),
      this.db.lancamentoRecorrente.count({ where: { categoryId } }),
    ]);

    return transactions + recurring;
  }

  async listSubcategoryIds(categoryId: string, userId: string): Promise<string[]> {
    const subs = await this.db.category.findMany({
      where: { parentCategoryId: categoryId, userId },
      select: { id: true },
    });

    return subs.map((item) => item.id);
  }

  async deleteById(categoryId: string, userId: string): Promise<boolean> {
    const existing = await this.findByIdForUser(categoryId, userId);

    if (!existing) {
      return false;
    }

    await this.db.category.delete({ where: { id: categoryId } });
    return true;
  }
}
