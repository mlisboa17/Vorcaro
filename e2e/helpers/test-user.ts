import { AccountType, CategoryType, PaymentMethodType, PrismaClient } from "@prisma/client";
import { hashPassword } from "../../src/lib/auth/password";

const prisma = new PrismaClient();
const DEV_PASSWORD = process.env.AUTH_DEV_PASSWORD ?? "dev123";

export type E2ETestUser = {
  userId: string;
  email: string;
  password: string;
  accountId: string;
  accountName: string;
};

export async function createE2ETestUser(prefix: string): Promise<E2ETestUser> {
  const email = `${prefix}-${Date.now()}@e2e.local`;
  const user = await prisma.user.create({
    data: {
      email,
      name: prefix,
      passwordHash: hashPassword(DEV_PASSWORD),
    },
  });

  const account = await prisma.financialAccount.create({
    data: {
      userId: user.id,
      name: "Conta E2E",
      type: AccountType.CORRENTE,
      balance: 5000,
      currency: "BRL",
      isActive: true,
    },
  });

  const expenseRoot = await prisma.category.create({
    data: { userId: user.id, name: "Despesas E2E", type: CategoryType.DESPESA, isActive: true },
  });
  await prisma.category.create({
    data: {
      userId: user.id,
      name: "Outros",
      type: CategoryType.DESPESA,
      parentCategoryId: expenseRoot.id,
      isActive: true,
    },
  });
  await prisma.paymentMethod.create({
    data: {
      userId: user.id,
      name: "PIX E2E",
      type: PaymentMethodType.PIX,
      isDefault: true,
      isActive: true,
    },
  });

  return {
    userId: user.id,
    email,
    password: DEV_PASSWORD,
    accountId: account.id,
    accountName: account.name,
  };
}

export async function cleanupE2ETestUser(userId: string) {
  await prisma.bankStatementLayoutCorrection.deleteMany({ where: { userId } });
  await prisma.bankStatementLayoutModel.deleteMany({ where: { userId } });
  await prisma.financialInbox.deleteMany({ where: { userId } });
  await prisma.transaction.deleteMany({ where: { userId } });
  await prisma.card.deleteMany({ where: { userId } });
  await prisma.paymentMethod.deleteMany({ where: { userId } });
  await prisma.category.deleteMany({ where: { userId } });
  await prisma.financialAccount.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}

export function getPrisma() {
  return prisma;
}
