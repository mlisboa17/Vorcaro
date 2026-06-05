import { normalizeCategoryName } from "./category-name-normalizer";

/**
 * Aliases de subcategorias para compatibilidade com regras, inbox e seeds legados.
 * Chave e valor são comparados após normalizeCategoryName.
 */
export const CATEGORY_SUBCATEGORY_ALIASES: Readonly<Record<string, string>> = {
  supermercado: "mercado",
  restaurante: "restaurantes",
  lanche: "cafes e lanches",
  ifood: "delivery",
  remedios: "farmacia",
  consulta: "consultas e exames",
  exames: "consultas e exames",
  odontologia: "dentista",
  uber: "uber e aplicativos",
  taxi: "uber e aplicativos",
  "software e assinaturas": "assinaturas digitais",
  softwares: "assinaturas digitais",
  cloud: "hospedagem e dominios",
  seguro: "seguro residencial",
  servicos: "servicos domesticos",
  financiamento: "financiamento imobiliario",
  "cartao de credito": "anuidades",
  emprestimos: "credito rotativo",
  financiamentos: "taxas de financiamento",
  "tarifas bancarias": "tarifas de conta",
  acoes: "investimentos",
  fundos: "investimentos",
  "tesouro direto": "investimentos",
  criptoativos: "investimentos",
  aportes: "aporte patrimonial",
  escola: "mensalidade escolar e cursos",
  faculdade: "mensalidade escolar e cursos",
  filhos: "mensalidade escolar e cursos",
  presentes: "presentes",
  viagens: "viagens, hoteis e passagens",
  eventos: "shows, festas e ingressos",
  hobbies: "shows, festas e ingressos",
};

/** Resolve nome canônico de subcategoria para matching em regras/seeds. */
export function resolveCategoryAlias(name: string): string {
  const normalized = normalizeCategoryName(name);
  return CATEGORY_SUBCATEGORY_ALIASES[normalized] ?? normalized;
}
