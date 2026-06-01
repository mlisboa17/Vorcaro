import type { FinanceCatalog } from "@/types/inbox";

export const MOCK_FINANCE_CATALOG: FinanceCatalog = {
  accounts: [
    {
      id: "mock-account-1",
      name: "Nubank Conta Principal",
      institutionName: "Nubank",
      type: "CORRENTE",
      currency: "BRL",
    },
    {
      id: "mock-account-2",
      name: "Carteira Dinheiro",
      institutionName: null,
      type: "CARTEIRA_DINHEIRO",
      currency: "BRL",
    },
  ],
  categories: [
    { id: "mock-cat-1", name: "Alimentação", type: "DESPESA", isActive: true, parentCategoryId: null },
    { id: "mock-cat-1a", name: "Mercado", type: "DESPESA", isActive: true, parentCategoryId: "mock-cat-1" },
    { id: "mock-cat-1b", name: "Padaria", type: "DESPESA", isActive: true, parentCategoryId: "mock-cat-1" },
    { id: "mock-cat-2", name: "Transporte", type: "DESPESA", isActive: true, parentCategoryId: null },
    { id: "mock-cat-2a", name: "Uber", type: "DESPESA", isActive: true, parentCategoryId: "mock-cat-2" },
    { id: "mock-cat-3", name: "Moradia", type: "DESPESA", isActive: true, parentCategoryId: null },
    { id: "mock-cat-4", name: "Receita", type: "RECEITA", isActive: true, parentCategoryId: null },
    { id: "mock-cat-4a", name: "Salário", type: "RECEITA", isActive: true, parentCategoryId: "mock-cat-4" },
    { id: "mock-cat-5", name: "Lazer", type: "DESPESA", isActive: true, parentCategoryId: null },
  ],
  paymentMethods: [
    { id: "mock-pm-1", name: "PIX", type: "PIX", isDefault: true, isActive: true },
    { id: "mock-pm-2", name: "Dinheiro", type: "DINHEIRO", isDefault: false, isActive: true },
    { id: "mock-pm-3", name: "Cartão", type: "CARTAO", isDefault: false, isActive: true },
    { id: "mock-pm-4", name: "Boleto", type: "BOLETO", isDefault: false, isActive: true },
    { id: "mock-pm-5", name: "Transferência", type: "TRANSFERENCIA", isDefault: false, isActive: true },
  ],
  cards: [
    {
      id: "mock-card-1",
      name: "Nubank Final 1234",
      institutionName: "Nubank",
      brand: "MASTERCARD",
      type: "CREDITO",
      lastFourDigits: "1234",
      financialAccountId: "mock-account-1",
      isActive: true,
    },
  ],
};
