import {
  AccountType,
  CardBrand,
  CardType,
  CategoryType,
  FrequenciaRecorrencia,
  PaymentMethodType,
  PrismaClient,
  TipoLancamentoRecorrente,
} from "@prisma/client";
import { seedCategoryTaxonomyForUser } from "../src/lib/categories/seed-category-taxonomy";
import {
  computeProximaExecucaoForSeed,
  extractOriginalStartDay,
} from "../src/modules/recurring-transactions/domain/services/calculate-next-recurring-date";

const prisma = new PrismaClient();

const DEV_EMAIL = "dev@logos.local";
const DEV_NAME = "Dev User";

const FINANCIAL_ACCOUNTS = [
  {
    name: "Nubank Conta Principal",
    institutionName: "Nubank",
    type: AccountType.CORRENTE,
    currency: "BRL",
  },
  {
    name: "Itaú Corrente",
    institutionName: "Itaú",
    type: AccountType.CORRENTE,
    currency: "BRL",
  },
  {
    name: "Carteira Dinheiro",
    institutionName: null,
    type: AccountType.CARTEIRA_DINHEIRO,
    currency: "BRL",
  },
  {
    name: "Wise USD",
    institutionName: "Wise",
    type: AccountType.CARTEIRA_DIGITAL,
    currency: "USD",
  },
] as const;

function parseSeedDate(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`);
}

async function findSubCategoryId(
  userId: string,
  parentName: string,
  childName: string,
): Promise<string | null> {
  const parent = await prisma.category.findFirst({
    where: { userId, name: parentName, parentCategoryId: null },
  });

  if (!parent) {
    return null;
  }

  const child = await prisma.category.findFirst({
    where: { userId, name: childName, parentCategoryId: parent.id },
  });

  return child?.id ?? null;
}

async function upsertRecurringTransaction(
  userId: string,
  input: {
    descricao: string;
    tipo: TipoLancamentoRecorrente;
    valor: number;
    frequencia: FrequenciaRecorrencia;
    dataInicio: string;
    dataFim?: string;
    categoryId: string;
    financialAccountId: string;
    paymentMethodId: string;
    cardId?: string | null;
    observacoes?: string;
  },
) {
  const dataInicio = parseSeedDate(input.dataInicio);
  const dataFim = input.dataFim ? parseSeedDate(input.dataFim) : null;
  const diaInicioOriginal = extractOriginalStartDay(dataInicio);
  const proximaExecucao = computeProximaExecucaoForSeed(
    dataInicio,
    input.frequencia,
    diaInicioOriginal,
  );

  const existing = await prisma.lancamentoRecorrente.findFirst({
    where: { userId, descricao: input.descricao },
  });

  const payload = {
    descricao: input.descricao,
    tipo: input.tipo,
    valor: input.valor,
    frequencia: input.frequencia,
    dataInicio,
    dataFim,
    proximaExecucao,
    estaAtivo: true,
    categoryId: input.categoryId,
    financialAccountId: input.financialAccountId,
    paymentMethodId: input.paymentMethodId,
    cardId: input.cardId ?? null,
    observacoes: input.observacoes ?? null,
    diaInicioOriginal,
  };

  if (existing) {
    return prisma.lancamentoRecorrente.update({
      where: { id: existing.id },
      data: payload,
    });
  }

  return prisma.lancamentoRecorrente.create({
    data: {
      userId,
      ...payload,
    },
  });
}

const PAYMENT_METHODS = [
  { name: "PIX", type: PaymentMethodType.PIX, isDefault: true },
  { name: "Dinheiro", type: PaymentMethodType.DINHEIRO, isDefault: false },
  { name: "Boleto", type: PaymentMethodType.BOLETO, isDefault: false },
  { name: "Transferência", type: PaymentMethodType.TRANSFERENCIA, isDefault: false },
  { name: "Cartão", type: PaymentMethodType.CARTAO, isDefault: false },
] as const;

const CARDS = [
  {
    name: "Nubank Crédito final 1234",
    institutionName: "Nubank",
    brand: CardBrand.MASTERCARD,
    type: CardType.CREDITO,
    lastFourDigits: "1234",
    accountName: "Nubank Conta Principal",
  },
  {
    name: "Itaú Débito final 5678",
    institutionName: "Itaú",
    brand: CardBrand.VISA,
    type: CardType.DEBITO,
    lastFourDigits: "5678",
    accountName: "Itaú Corrente",
  },
  {
    name: "Cartão Virtual",
    institutionName: null,
    brand: CardBrand.VISA,
    type: CardType.CREDITO,
    lastFourDigits: null,
    accountName: null,
  },
] as const;

async function upsertFinancialAccount(
  userId: string,
  account: (typeof FINANCIAL_ACCOUNTS)[number],
) {
  return prisma.financialAccount.upsert({
    where: { userId_name: { userId, name: account.name } },
    create: {
      userId,
      name: account.name,
      institutionName: account.institutionName,
      type: account.type,
      currency: account.currency,
      isActive: true,
    },
    update: {
      institutionName: account.institutionName,
      type: account.type,
      currency: account.currency,
      isActive: true,
    },
  });
}

async function upsertRootCategory(userId: string, name: string, type: CategoryType) {
  const existing = await prisma.category.findFirst({
    where: { userId, name, parentCategoryId: null },
  });

  if (existing) {
    return prisma.category.update({
      where: { id: existing.id },
      data: { type, isSystem: true, isActive: true },
    });
  }

  return prisma.category.create({
    data: { userId, name, type, parentCategoryId: null, isSystem: true, isActive: true },
  });
}

async function upsertSubCategory(
  userId: string,
  parentCategoryId: string,
  name: string,
  type: CategoryType,
) {
  const existing = await prisma.category.findFirst({
    where: { userId, name, parentCategoryId },
  });

  if (existing) {
    return prisma.category.update({
      where: { id: existing.id },
      data: { type, isSystem: true, isActive: true },
    });
  }

  return prisma.category.create({
    data: {
      userId,
      name,
      type,
      parentCategoryId,
      isSystem: true,
      isActive: true,
    },
  });
}

async function upsertPaymentMethod(
  userId: string,
  name: string,
  type: PaymentMethodType,
  isDefault: boolean,
) {
  return prisma.paymentMethod.upsert({
    where: { userId_name: { userId, name } },
    create: { userId, name, type, isDefault, isActive: true },
    update: { type, isDefault, isActive: true },
  });
}

async function upsertCard(
  userId: string,
  card: (typeof CARDS)[number],
  accountByName: Map<string, string>,
) {
  const financialAccountId = card.accountName
    ? (accountByName.get(card.accountName) ?? null)
    : null;

  return prisma.card.upsert({
    where: { userId_name: { userId, name: card.name } },
    create: {
      userId,
      financialAccountId,
      name: card.name,
      institutionName: card.institutionName,
      brand: card.brand,
      type: card.type,
      lastFourDigits: card.lastFourDigits,
      closingDay: card.name.includes("Nubank Crédito") ? 5 : null,
      dueDay: card.name.includes("Nubank Crédito") ? 12 : null,
      isActive: true,
    },
    update: {
      financialAccountId,
      institutionName: card.institutionName,
      brand: card.brand,
      type: card.type,
      lastFourDigits: card.lastFourDigits,
      closingDay: card.name.includes("Nubank Crédito") ? 5 : null,
      dueDay: card.name.includes("Nubank Crédito") ? 12 : null,
      isActive: true,
    },
  });
}

async function main() {
  const user = await prisma.user.upsert({
    where: { email: DEV_EMAIL },
    create: { email: DEV_EMAIL, name: DEV_NAME },
    update: { name: DEV_NAME },
  });

  const accounts = await Promise.all(
    FINANCIAL_ACCOUNTS.map((account) => upsertFinancialAccount(user.id, account)),
  );

  const accountByName = new Map(accounts.map((account) => [account.name, account.id]));

  const taxonomyReport = await seedCategoryTaxonomyForUser(prisma, user.id);
  console.info(`  Taxonomia Vorcaro: +${taxonomyReport.subcategoriesCreated} subcategorias`);

  const paymentMethods = await Promise.all(
    PAYMENT_METHODS.map((method) =>
      upsertPaymentMethod(user.id, method.name, method.type, method.isDefault),
    ),
  );

  const cards = await Promise.all(
    CARDS.map((card) => upsertCard(user.id, card, accountByName)),
  );

  const paymentMethodByName = new Map(paymentMethods.map((method) => [method.name, method.id]));

  const salarioCategoryId = await findSubCategoryId(user.id, "Receita", "Salário");
  const aluguelCategoryId = await findSubCategoryId(user.id, "Moradia", "Aluguel");
  const energiaCategoryId = await findSubCategoryId(user.id, "Moradia", "Energia");
  const internetCategoryId = await findSubCategoryId(user.id, "Moradia", "Internet");
  const condominioCategoryId = await findSubCategoryId(user.id, "Moradia", "Condomínio");
  const seguroCategoryId = await findSubCategoryId(user.id, "Moradia", "Seguro Residencial");
  const servicosCategoryId = await findSubCategoryId(user.id, "Moradia", "Serviços Domésticos");
  const streamingCategoryId = await findSubCategoryId(user.id, "Lazer", "Streaming");
  const mercadoCategoryId = await findSubCategoryId(user.id, "Alimentação", "Mercado");

  const nubankAccountId = accountByName.get("Nubank Conta Principal");
  const itauAccountId = accountByName.get("Itaú Corrente");
  const cashAccountId = accountByName.get("Carteira Dinheiro");
  const nubankCardId = cards.find((card) => card.name.includes("Nubank Crédito"))?.id;

  const recurringSeeds = [
    salarioCategoryId &&
      nubankAccountId &&
      paymentMethodByName.get("Transferência") && {
        descricao: "Salário mensal",
        tipo: TipoLancamentoRecorrente.RECEITA,
        valor: 8500,
        frequencia: FrequenciaRecorrencia.MENSAL,
        dataInicio: "2026-01-05",
        categoryId: salarioCategoryId,
        financialAccountId: nubankAccountId,
        paymentMethodId: paymentMethodByName.get("Transferência")!,
        observacoes: "Recebimento mensal na conta Nubank",
      },
    internetCategoryId &&
      itauAccountId &&
      paymentMethodByName.get("Boleto") && {
        descricao: "Internet mensal",
        tipo: TipoLancamentoRecorrente.DESPESA,
        valor: 119.9,
        frequencia: FrequenciaRecorrencia.MENSAL,
        dataInicio: "2026-01-10",
        categoryId: internetCategoryId,
        financialAccountId: itauAccountId,
        paymentMethodId: paymentMethodByName.get("Boleto")!,
        observacoes: "Boleto Itaú",
      },
    aluguelCategoryId &&
      itauAccountId &&
      paymentMethodByName.get("Transferência") && {
        descricao: "Aluguel mensal",
        tipo: TipoLancamentoRecorrente.DESPESA,
        valor: 4000,
        frequencia: FrequenciaRecorrencia.MENSAL,
        dataInicio: "2026-01-05",
        categoryId: aluguelCategoryId,
        financialAccountId: itauAccountId,
        paymentMethodId: paymentMethodByName.get("Transferência")!,
        observacoes: "Transferência todo dia 5",
      },
    energiaCategoryId &&
      itauAccountId &&
      paymentMethodByName.get("Boleto") && {
        descricao: "Energia mensal",
        tipo: TipoLancamentoRecorrente.DESPESA,
        valor: 280,
        frequencia: FrequenciaRecorrencia.MENSAL,
        dataInicio: "2026-01-15",
        categoryId: energiaCategoryId,
        financialAccountId: itauAccountId,
        paymentMethodId: paymentMethodByName.get("Boleto")!,
        observacoes: "Conta de luz",
      },
    streamingCategoryId &&
      nubankAccountId &&
      paymentMethodByName.get("Cartão") &&
      nubankCardId && {
        descricao: "Assinatura streaming",
        tipo: TipoLancamentoRecorrente.DESPESA,
        valor: 55.9,
        frequencia: FrequenciaRecorrencia.MENSAL,
        dataInicio: "2026-01-12",
        categoryId: streamingCategoryId,
        financialAccountId: nubankAccountId,
        paymentMethodId: paymentMethodByName.get("Cartão")!,
        cardId: nubankCardId,
        observacoes: "Cobrança no crédito Nubank",
      },
    mercadoCategoryId &&
      cashAccountId &&
      paymentMethodByName.get("Dinheiro") && {
        descricao: "Feira semanal",
        tipo: TipoLancamentoRecorrente.DESPESA,
        valor: 180,
        frequencia: FrequenciaRecorrencia.SEMANAL,
        dataInicio: "2026-01-04",
        categoryId: mercadoCategoryId,
        financialAccountId: cashAccountId,
        paymentMethodId: paymentMethodByName.get("Dinheiro")!,
        observacoes: "Compras semanais em dinheiro",
      },
    condominioCategoryId &&
      itauAccountId &&
      paymentMethodByName.get("Boleto") && {
        descricao: "Condomínio mensal",
        tipo: TipoLancamentoRecorrente.DESPESA,
        valor: 650,
        frequencia: FrequenciaRecorrencia.MENSAL,
        dataInicio: "2026-01-08",
        categoryId: condominioCategoryId,
        financialAccountId: itauAccountId,
        paymentMethodId: paymentMethodByName.get("Boleto")!,
        observacoes: "Taxa condominial",
      },
    seguroCategoryId &&
      itauAccountId &&
      paymentMethodByName.get("Transferência") && {
        descricao: "Seguro mensal",
        tipo: TipoLancamentoRecorrente.DESPESA,
        valor: 189.9,
        frequencia: FrequenciaRecorrencia.MENSAL,
        dataInicio: "2026-01-20",
        categoryId: seguroCategoryId,
        financialAccountId: itauAccountId,
        paymentMethodId: paymentMethodByName.get("Transferência")!,
        observacoes: "Seguro residencial",
      },
    servicosCategoryId &&
      nubankAccountId &&
      paymentMethodByName.get("PIX") && {
        descricao: "Prestador quinzenal",
        tipo: TipoLancamentoRecorrente.DESPESA,
        valor: 220,
        frequencia: FrequenciaRecorrencia.QUINZENAL,
        dataInicio: "2026-01-06",
        categoryId: servicosCategoryId,
        financialAccountId: nubankAccountId,
        paymentMethodId: paymentMethodByName.get("PIX")!,
        observacoes: "Serviço doméstico quinzenal",
      },
  ].filter(Boolean) as Array<Parameters<typeof upsertRecurringTransaction>[1]>;

  const recurringTransactions = await Promise.all(
    recurringSeeds.map((seed) => upsertRecurringTransaction(user.id, seed)),
  );

  const liabilities = await Promise.all([
    prisma.patrimonyLiability.upsert({
      where: { id: "seed-liability-corolla" },
      update: {},
      create: {
        id: "seed-liability-corolla",
        userId: user.id,
        nome: "Financiamento Corolla",
        tipo: "FINANCING",
        saldoOriginal: 100_000,
        saldoAtual: 82_000,
        estaAtivo: true,
      },
    }),
    prisma.patrimonyLiability.upsert({
      where: { id: "seed-liability-apartamento" },
      update: {},
      create: {
        id: "seed-liability-apartamento",
        userId: user.id,
        nome: "Financiamento Apartamento",
        tipo: "FINANCING",
        saldoOriginal: 500_000,
        saldoAtual: 420_000,
        estaAtivo: true,
      },
    }),
  ]);

  const assets = await Promise.all([
    prisma.patrimonyAsset.upsert({
      where: { id: "seed-asset-corolla" },
      update: {},
      create: {
        id: "seed-asset-corolla",
        userId: user.id,
        nome: "Corolla XEi",
        tipo: "VEHICLE",
        valorAquisicao: 120_000,
        valorAtual: 110_000,
        dataAquisicao: new Date("2024-01-15T12:00:00.000Z"),
        linkedLiabilityId: "seed-liability-corolla",
        estaAtivo: true,
      },
    }),
    prisma.patrimonyAsset.upsert({
      where: { id: "seed-asset-apartamento" },
      update: {},
      create: {
        id: "seed-asset-apartamento",
        userId: user.id,
        nome: "Apartamento Boa Viagem",
        tipo: "REAL_ESTATE",
        valorAquisicao: 500_000,
        valorAtual: 620_000,
        dataAquisicao: new Date("2022-08-01T12:00:00.000Z"),
        linkedLiabilityId: "seed-liability-apartamento",
        estaAtivo: true,
      },
    }),
    prisma.patrimonyAsset.upsert({
      where: { id: "seed-asset-cdb-inter" },
      update: {},
      create: {
        id: "seed-asset-cdb-inter",
        userId: user.id,
        nome: "CDB Banco Inter",
        tipo: "INVESTMENT",
        valorAquisicao: 50_000,
        valorAtual: 58_000,
        dataAquisicao: new Date("2025-03-10T12:00:00.000Z"),
        estaAtivo: true,
      },
    }),
  ]);

  console.info("Seed concluído com sucesso:");
  console.info(`  User:               ${user.email} (${user.id})`);
  console.info(`  FinancialAccounts:  ${accounts.length}`);
  const categoryCount = await prisma.category.count({ where: { userId: user.id } });
  console.info(`  Categories:         ${categoryCount}`);
  console.info(`  PaymentMethods:     ${paymentMethods.length}`);
  console.info(`  Cards:              ${cards.length}`);
  console.info(`  Recorrentes:        ${recurringTransactions.length}`);
  console.info(`  Passivos:           ${liabilities.length}`);
  console.info(`  Ativos:             ${assets.length}`);

  const consortiums = await Promise.all([
    prisma.consortium.upsert({
      where: { id: "seed-consortium-vehicle" },
      update: {},
      create: {
        id: "seed-consortium-vehicle",
        userId: user.id,
        nome: "Consórcio Honda Civic",
        tipo: "VEHICLE",
        status: "NOT_CONTEMPLATED",
        valorCredito: 120_000,
        valorLance: 15_000,
        valorPago: 24_000,
        valorTaxas: 8_000,
        quantidadeParcelas: 80,
        parcelasPagas: 16,
        dataContratacao: new Date("2025-06-01T12:00:00.000Z"),
        estaAtivo: true,
      },
    }),
    prisma.consortium.upsert({
      where: { id: "seed-consortium-realestate" },
      update: {},
      create: {
        id: "seed-consortium-realestate",
        userId: user.id,
        nome: "Consórcio Apartamento Boa Viagem",
        tipo: "REAL_ESTATE",
        status: "ASSET_ACQUIRED",
        valorCredito: 500_000,
        valorLance: 80_000,
        valorPago: 180_000,
        valorTaxas: 25_000,
        quantidadeParcelas: 180,
        parcelasPagas: 65,
        dataContratacao: new Date("2022-03-15T12:00:00.000Z"),
        dataContemplacao: new Date("2024-08-20T12:00:00.000Z"),
        assetId: "seed-asset-apartamento",
        estaAtivo: true,
      },
    }),
  ]);

  console.info(`  Consórcios:          ${consortiums.length}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
