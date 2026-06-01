import type { CardBrand, CardType } from "@prisma/client";
export type {
  ConfigAccountType,
  ConfigCategoryType,
  ConfigPaymentMethodType,
} from "@/modules/financial-config/domain/mappers/config-api.mapper";
import type {
  ConfigAccountType,
  ConfigCategoryType,
  ConfigPaymentMethodType,
} from "@/modules/financial-config/domain/mappers/config-api.mapper";

export type InstrumentsTab = "contas" | "cartoes" | "categorias" | "formas";

export interface ConfigConta {
  id: string;
  nome: string;
  nomeInstituicao: string | null;
  tipo: ConfigAccountType | null;
  moeda: string;
  saldo: number;
  estaAtiva?: boolean;
}

export interface ConfigCartao {
  id: string;
  nome: string;
  contaFinanceiraId: string | null;
  nomeInstituicao: string | null;
  bandeira: CardBrand;
  tipo: CardType;
  ultimosQuatroDigitos: string | null;
  estaAtivo?: boolean;
}

export interface ConfigCategoria {
  id: string;
  nome: string;
  tipo: ConfigCategoryType | null;
  estaAtiva?: boolean;
  subcategorias?: ConfigCategoria[];
  categoriaPaiId?: string | null;
}

export interface ConfigFormaPagamento {
  id: string;
  nome: string;
  tipo: ConfigPaymentMethodType | null;
  padrao: boolean;
  estaAtiva?: boolean;
}

export interface InstrumentsData {
  contas: ConfigConta[];
  cartoes: ConfigCartao[];
  categorias: ConfigCategoria[];
  formasPagamento: ConfigFormaPagamento[];
}

export const INSTRUMENTS_TABS: {
  value: InstrumentsTab;
  label: string;
}[] = [
  { value: "categorias", label: "Categorias" },
  { value: "contas", label: "Contas Financeiras" },
  { value: "cartoes", label: "Cartões" },
  { value: "formas", label: "Formas de Pagamento" },
];

export const ACCOUNT_TYPE_OPTIONS: ConfigAccountType[] = [
  "CORRENTE",
  "POUPANCA",
  "INVESTIMENTO",
  "CARTEIRA_DIGITAL",
  "CARTEIRA_DINHEIRO",
  "PJ",
];

export const PAYMENT_TYPE_OPTIONS: ConfigPaymentMethodType[] = [
  "PIX",
  "DINHEIRO",
  "BOLETO",
  "TRANSFERENCIA",
  "CARTAO",
  "DEBITO_AUTOMATICO",
];

export const CARD_BRAND_OPTIONS: CardBrand[] = [
  "VISA",
  "MASTERCARD",
  "ELO",
  "AMEX",
  "HIPERCARD",
  "OTHER",
];

export const CARD_TYPE_OPTIONS: CardType[] = ["CREDITO", "DEBITO", "MULTIPLO"];

export const ACCOUNT_TYPE_LABELS: Record<ConfigAccountType, string> = {
  CORRENTE: "Corrente",
  POUPANCA: "Poupança",
  INVESTIMENTO: "Investimento",
  CARTEIRA_DIGITAL: "Carteira Digital",
  CARTEIRA_DINHEIRO: "Carteira Dinheiro",
  PJ: "Pessoa Jurídica",
};

export const PAYMENT_TYPE_LABELS: Record<ConfigPaymentMethodType, string> = {
  PIX: "PIX",
  DINHEIRO: "Dinheiro",
  BOLETO: "Boleto",
  TRANSFERENCIA: "Transferência",
  CARTAO: "Cartão",
  DEBITO_AUTOMATICO: "Débito Automático",
};

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  CREDITO: "Crédito",
  DEBITO: "Débito",
  MULTIPLO: "Múltiplo",
};

export const CATEGORY_TYPE_LABELS: Record<ConfigCategoryType, string> = {
  RECEITA: "Receita",
  DESPESA: "Despesa",
};
