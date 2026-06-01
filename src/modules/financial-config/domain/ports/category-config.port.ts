import type { CategoryType } from "@prisma/client";

export interface CategoryConfigRecord {
  id: string;
  userId: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  isSystem: boolean;
  isActive: boolean;
  parentCategoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryTreeNode extends CategoryConfigRecord {
  subcategories: CategoryConfigRecord[];
}

export interface CreateCategoryConfigInput {
  userId: string;
  name: string;
  type: CategoryType;
  parentCategoryId?: string | null;
}

export interface UpdateCategoryConfigInput {
  name?: string;
  isActive?: boolean;
}

export interface CategoryConfigRepositoryPort {
  listTreeByUserId(userId: string): Promise<CategoryTreeNode[]>;
  listAllActiveByUserId(userId: string): Promise<CategoryConfigRecord[]>;
  findByIdForUser(categoryId: string, userId: string): Promise<CategoryConfigRecord | null>;
  create(input: CreateCategoryConfigInput): Promise<CategoryConfigRecord>;
  update(
    categoryId: string,
    userId: string,
    input: UpdateCategoryConfigInput,
  ): Promise<CategoryConfigRecord | null>;
  belongsToUser(categoryId: string, userId: string): Promise<boolean>;
}
