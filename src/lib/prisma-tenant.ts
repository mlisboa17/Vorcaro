import { prisma } from "./prisma";

export const TENANT_MODELS = [
  "FinancialAccount",
  "Card",
  "Category",
  "PaymentMethod",
  "Transaction",
  "LancamentoRecorrente",
  "FinancialInbox",
  "UserRule",
  "UserLearningPattern",
  "PatrimonyAsset",
  "Consortium",
  "PatrimonyLiability",
  "PatrimonyTransaction",
  "FinancialGoal",
  "Receivable",
  "FinancialAlert",
] as const;

export type TenantModel = (typeof TENANT_MODELS)[number];

export function getTenantPrisma(userId: string) {
  return prisma.$extends({
    name: "tenant-scoping",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (model && TENANT_MODELS.includes(model as any)) {
            const anyArgs = args as any;

            // 1. CREATE
            if (["create", "createMany"].includes(operation)) {
              if (anyArgs.data) {
                if (Array.isArray(anyArgs.data)) {
                  anyArgs.data = anyArgs.data.map((d: any) => ({ ...d, userId }));
                } else {
                  anyArgs.data = { ...anyArgs.data, userId };
                }
              }
              return query(args);
            }

            // 2. READ / UPDATE MANY
            if (
              ["findMany", "findFirst", "findFirstOrThrow", "count", "updateMany", "deleteMany", "aggregate", "groupBy"].includes(
                operation
              )
            ) {
              anyArgs.where = { ...anyArgs.where, userId };
              return query(args);
            }

            // 3. READ / UPDATE / DELETE UNIQUE
            if (["findUnique", "findUniqueOrThrow", "update", "delete"].includes(operation)) {
              // Verifica posse antes de permitir operações que exigem chave única
              const accessCheck = await (prisma as any)[model].findFirst({
                where: { ...anyArgs.where, userId },
                select: { id: true },
              });

              if (!accessCheck) {
                throw new Error(`[TenantGuard] Access denied or record not found for ${model}`);
              }

              if (operation === "update" && anyArgs.data) {
                // Impede a transferência de posse de registro
                anyArgs.data.userId = userId;
              }

              return query(args);
            }
          }
          return query(args);
        },
      },
    },
  });
}
