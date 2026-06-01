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

  async listTreeByUserId(userId: string): Promise<CategoryTreeNode[]> {
    const roots = await this.db.category.findMany({
      where: { userId, isActive: true, parentCategoryId: null },
      orderBy: { name: "asc" },
      include: {
        subcategories: {
          where: { isActive: true },
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
      where: { id: categoryId, userId, isActive: true },
      select: { id: true },
    });

    return category !== null;
  }
}
