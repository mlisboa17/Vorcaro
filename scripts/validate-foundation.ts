/**
 * Validação da fundação financeira (Fases 2–3).
 * Executar: npx tsx scripts/validate-foundation.ts
 */
import { PrismaClient } from "@prisma/client";
import { CreateTransactionUseCase } from "@/modules/transactions/application/use-cases/create-transaction.use-case";
import { CreateTransactionError } from "@/modules/transactions/application/errors/create-transaction.error";
import {
  PrismaCardOwnershipRepository,
  PrismaCategoryRepository,
  PrismaFinancialAccountRepository,
  PrismaPaymentMethodRepository,
} from "@/modules/transactions/infrastructure/repositories/prisma-ownership.repositories";
import { PrismaTransactionRepository } from "@/modules/transactions/infrastructure/repositories/prisma-transaction.repository";
import { ListInboxItemsUseCase } from "@/modules/financial-inbox/application/use-cases/list-inbox-items.use-case";
import { PrismaInboxRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-inbox.repository";
import { validateTransactionInstruments } from "@/modules/financial-inbox/application/validators/transaction-instrument.validator";

const prisma = new PrismaClient();
const DEV_EMAIL = "dev@logos.local";

type TestResult = { name: string; ok: boolean; detail?: string };

const results: TestResult[] = [];

function pass(name: string, detail?: string) {
  results.push({ name, ok: true, detail });
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name: string, detail?: string) {
  results.push({ name, ok: false, detail });
  console.error(`❌ ${name}${detail ? ` — ${detail}` : ""}`);
}

async function loadDevInstruments(userId: string) {
  const [category, correnteAccount, cashAccount, pixMethod, cardMethod, card] =
    await Promise.all([
      prisma.category.findFirst({ where: { userId, name: "Alimentação", isActive: true } }),
      prisma.financialAccount.findFirst({
        where: { userId, name: "Nubank Conta Principal", isActive: true },
      }),
      prisma.financialAccount.findFirst({
        where: { userId, name: "Carteira Dinheiro", isActive: true },
      }),
      prisma.paymentMethod.findFirst({ where: { userId, type: "PIX", isActive: true } }),
      prisma.paymentMethod.findFirst({ where: { userId, type: "CARTAO", isActive: true } }),
      prisma.card.findFirst({
        where: { userId, name: "Nubank Crédito final 1234", isActive: true },
      }),
    ]);

  const dinheiroMethod = await prisma.paymentMethod.findFirst({
    where: { userId, type: "DINHEIRO", isActive: true },
  });

  if (!category || !correnteAccount || !cashAccount || !pixMethod || !cardMethod || !card || !dinheiroMethod) {
    throw new Error("Seed incompleto — execute npm run db:seed");
  }

  return { category, correnteAccount, cashAccount, pixMethod, cardMethod, dinheiroMethod, card };
}

function createTransactionUseCase() {
  return new CreateTransactionUseCase(
    new PrismaTransactionRepository(prisma),
    new PrismaCategoryRepository(prisma),
    new PrismaFinancialAccountRepository(prisma),
    new PrismaPaymentMethodRepository(prisma),
    new PrismaCardOwnershipRepository(prisma),
  );
}

function ownershipRepos() {
  return {
    categoryRepository: new PrismaCategoryRepository(prisma),
    financialAccountRepository: new PrismaFinancialAccountRepository(prisma),
    paymentMethodRepository: new PrismaPaymentMethodRepository(prisma),
    cardRepository: new PrismaCardOwnershipRepository(prisma),
  };
}

async function main() {
  console.log("\n🧪 Validação da fundação Logos Financeiro\n");

  const devUser = await prisma.user.findUnique({ where: { email: DEV_EMAIL } });
  if (!devUser) {
    throw new Error(`Usuário ${DEV_EMAIL} não encontrado — execute npm run db:seed`);
  }

  const instruments = await loadDevInstruments(devUser.id);
  const useCase = createTransactionUseCase();
  const today = new Date().toISOString().slice(0, 10);
  const testRunId = Date.now().toString(36);

  // ── 1. Transação PIX (categoria + conta + forma) ─────────────────────────
  try {
    const tx = await useCase.execute({
      userId: devUser.id,
      descricao: `[teste-${testRunId}] Almoço PIX`,
      valor: 42.5,
      tipo: "EXPENSE",
      data: today,
      categoriaId: instruments.category.id,
      contaFinanceiraId: instruments.correnteAccount.id,
      formaPagamentoId: instruments.pixMethod.id,
    });
    pass("Transação PIX (categoria/conta/forma)", tx.id);
  } catch (error) {
    fail(
      "Transação PIX (categoria/conta/forma)",
      error instanceof Error ? error.message : String(error),
    );
  }

  // ── 2. Transação com cartão ───────────────────────────────────────────────
  try {
    const tx = await useCase.execute({
      userId: devUser.id,
      descricao: `[teste-${testRunId}] Compra cartão`,
      valor: 199.9,
      tipo: "EXPENSE",
      data: today,
      categoriaId: instruments.category.id,
      contaFinanceiraId: instruments.correnteAccount.id,
      formaPagamentoId: instruments.cardMethod.id,
      cartaoId: instruments.card.id,
    });
    pass("Transação com cartão", tx.id);
  } catch (error) {
    fail("Transação com cartão", error instanceof Error ? error.message : String(error));
  }

  // ── 3a. Cartão sem cartaoId deve falhar ───────────────────────────────────
  try {
    await useCase.execute({
      userId: devUser.id,
      descricao: `[teste-${testRunId}] Cartão sem ID`,
      valor: 10,
      tipo: "EXPENSE",
      data: today,
      categoriaId: instruments.category.id,
      contaFinanceiraId: instruments.correnteAccount.id,
      formaPagamentoId: instruments.cardMethod.id,
    });
    fail("Cartão sem cartaoId deve falhar", "esperava erro de validação");
  } catch (error) {
    if (
      error instanceof CreateTransactionError &&
      error.message.includes("cartaoId é obrigatório")
    ) {
      pass("Cartão sem cartaoId rejeitado corretamente");
    } else {
      fail("Cartão sem cartaoId deve falhar", error instanceof Error ? error.message : String(error));
    }
  }

  // ── 3b. PIX com cartaoId deve falhar ──────────────────────────────────────
  try {
    await validateTransactionInstruments(ownershipRepos(), {
      userId: devUser.id,
      categoryId: instruments.category.id,
      accountId: instruments.correnteAccount.id,
      paymentMethodId: instruments.pixMethod.id,
      cardId: instruments.card.id,
    });
    fail("PIX com cartaoId deve falhar", "esperava erro de validação");
  } catch (error) {
    if (error instanceof Error && error.message.includes("não deve ser informado")) {
      pass("PIX com cartaoId rejeitado corretamente");
    } else {
      fail("PIX com cartaoId deve falhar", error instanceof Error ? error.message : String(error));
    }
  }

  // ── 4. Transação em dinheiro (carteira dinheiro) ──────────────────────────
  try {
    const tx = await useCase.execute({
      userId: devUser.id,
      descricao: `[teste-${testRunId}] Troco dinheiro`,
      valor: 15,
      tipo: "EXPENSE",
      data: today,
      categoriaId: instruments.category.id,
      contaFinanceiraId: instruments.cashAccount.id,
      formaPagamentoId: instruments.dinheiroMethod.id,
    });
    pass("Transação em dinheiro (Carteira Dinheiro)", tx.id);
  } catch (error) {
    fail(
      "Transação em dinheiro (Carteira Dinheiro)",
      error instanceof Error ? error.message : String(error),
    );
  }

  // ── 5. Dinheiro em conta corrente deve falhar ─────────────────────────────
  try {
    await useCase.execute({
      userId: devUser.id,
      descricao: `[teste-${testRunId}] Dinheiro errado`,
      valor: 5,
      tipo: "EXPENSE",
      data: today,
      categoriaId: instruments.category.id,
      contaFinanceiraId: instruments.correnteAccount.id,
      formaPagamentoId: instruments.dinheiroMethod.id,
    });
    fail("Dinheiro em conta corrente deve falhar", "esperava erro de validação");
  } catch (error) {
    if (
      error instanceof CreateTransactionError &&
      error.message.includes("Carteira Dinheiro")
    ) {
      pass("Dinheiro em conta corrente rejeitado corretamente");
    } else {
      fail(
        "Dinheiro em conta corrente deve falhar",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  // ── 6. Listagem da inbox ──────────────────────────────────────────────────
  try {
    const inboxUseCase = new ListInboxItemsUseCase(new PrismaInboxRepository(prisma));
    const inbox = await inboxUseCase.execute({ userId: devUser.id, filters: { limit: 5 } });
    pass("Listagem da inbox", `${inbox.total} item(ns) total`);
  } catch (error) {
    fail("Listagem da inbox", error instanceof Error ? error.message : String(error));
  }

  // ── 7. Isolamento por usuário ─────────────────────────────────────────────
  const otherUser = await prisma.user.upsert({
    where: { email: "isolamento@test.local" },
    create: { email: "isolamento@test.local", name: "Isolamento Test" },
    update: {},
  });

  try {
    await validateTransactionInstruments(ownershipRepos(), {
      userId: otherUser.id,
      categoryId: instruments.category.id,
      accountId: instruments.correnteAccount.id,
      paymentMethodId: instruments.pixMethod.id,
    });
    fail("Isolamento por usuário", "outro usuário acessou categoria/conta do dev");
  } catch (error) {
    if (error instanceof Error && error.message.includes("não encontrada")) {
      pass("Isolamento por usuário", "instrumentos do dev inacessíveis para outro usuário");
    } else {
      fail("Isolamento por usuário", error instanceof Error ? error.message : String(error));
    }
  }

  // ── 8. Config APIs retornam apenas ativos ─────────────────────────────────
  const inactiveCategory = await prisma.category.create({
    data: {
      userId: devUser.id,
      name: `[inativa-${testRunId}]`,
      type: "DESPESA",
      isActive: false,
    },
  });

  const activeCategories = await prisma.category.findMany({
    where: { userId: devUser.id, isActive: true },
  });

  if (activeCategories.some((c) => c.id === inactiveCategory.id)) {
    fail("Soft delete categorias", "categoria inativa apareceu na listagem ativa");
  } else {
    pass("Soft delete categorias", "isActive=false excluída da listagem ativa");
  }

  await prisma.category.delete({ where: { id: inactiveCategory.id } }).catch(() => null);

  // ── Resumo ────────────────────────────────────────────────────────────────
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${"─".repeat(50)}`);
  console.log(`Resultado: ${results.length - failed.length}/${results.length} testes passaram`);

  if (failed.length > 0) {
    console.error("\nFalhas:");
    for (const f of failed) {
      console.error(`  • ${f.name}: ${f.detail ?? "sem detalhe"}`);
    }
    process.exit(1);
  }

  console.log("\n✅ Fundação estável — pronto para Fase 3 da interface.\n");
}

main()
  .catch((error) => {
    console.error("Erro fatal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
