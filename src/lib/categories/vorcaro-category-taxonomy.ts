import { CategoryType } from "@prisma/client";

export type CategoryTaxonomyEntry = {
  name: string;
  type: CategoryType;
  children: readonly string[];
};

/**
 * Taxonomia oficial Vorcaro — Sprint 14.8.
 * Idempotente via seed-category-taxonomy; nomes canônicos preservados para regras existentes.
 */
export const VORCARO_CATEGORY_TAXONOMY: readonly CategoryTaxonomyEntry[] = [
  {
    name: "Receita",
    type: CategoryType.RECEITA,
    children: [
      "Salário",
      "Pró-labore",
      "Comissão",
      "Freelance",
      "Dividendos",
      "Aluguel Recebido",
      "Rendimentos",
      "Venda de Ativos",
      "Reembolso",
      "Outras Receitas",
    ],
  },
  {
    name: "Moradia",
    type: CategoryType.DESPESA,
    children: [
      "Aluguel",
      "Financiamento Imobiliário",
      "Condomínio",
      "IPTU",
      "Energia",
      "Água",
      "Internet",
      "Manutenção Residencial",
      "Seguro Residencial",
      "Serviços Domésticos",
      "Funcionária",
    ],
  },
  {
    name: "Alimentação",
    type: CategoryType.DESPESA,
    children: ["Mercado", "Padaria", "Restaurantes", "Delivery", "Cafés e Lanches", "iFood"],
  },
  {
    name: "Transporte",
    type: CategoryType.DESPESA,
    children: [
      "Combustível",
      "Uber e Aplicativos",
      "Estacionamento",
      "Pedágio",
      "Manutenção e Lavagem",
      "Seguro Auto",
      "IPVA e Licenciamento",
      "Multas e Documentação",
    ],
  },
  {
    name: "Saúde",
    type: CategoryType.DESPESA,
    children: [
      "Plano de Saúde",
      "Consultas e Exames",
      "Farmácia",
      "Dentista",
      "Academia e Esportes",
      "Terapia e Psicólogo",
    ],
  },
  {
    name: "Educação",
    type: CategoryType.DESPESA,
    children: ["Escola", "Faculdade", "Cursos", "Livros"],
  },
  {
    name: "Lazer",
    type: CategoryType.DESPESA,
    children: [
      "Cinema",
      "Streaming",
      "Viagens, Hotéis e Passagens",
      "Shows, Festas e Ingressos",
      "Bares e Pubs",
      "Hospedagem e Airbnb",
      "Zé Delivery",
    ],
  },
  {
    name: "Financeiro",
    type: CategoryType.DESPESA,
    children: [
      "Cartão de Crédito",
      "Empréstimos",
      "Financiamentos",
      "Juros",
      "Tarifas Bancárias",
      "IOF",
    ],
  },
  {
    name: "Investimentos",
    type: CategoryType.DESPESA,
    children: ["Ações", "Fundos", "Tesouro Direto", "Criptoativos", "Aportes"],
  },
  {
    name: "Impostos",
    type: CategoryType.DESPESA,
    children: ["IRPF", "ISS", "ICMS", "Taxas"],
  },
  {
    name: "Tecnologia e Serviços Digitais",
    type: CategoryType.DESPESA,
    children: [
      "Inteligência Artificial",
      "Assinaturas Digitais",
      "Hospedagem e Domínios",
      "Softwares",
      "Cloud",
      "Equipamentos",
      "Aplicativos",
    ],
  },
  {
    name: "Pets",
    type: CategoryType.DESPESA,
    children: ["Ração", "Veterinário", "Medicamentos", "Banho e Tosa", "Despesas Pet"],
  },
  {
    name: "Família e Filhos",
    type: CategoryType.DESPESA,
    children: [
      "Filhos",
      "Presentes",
      "Apoio Familiar",
      "Dependentes",
      "Pensão Alimentícia",
      "Mensalidade Escolar e Cursos",
      "Material Escolar e Livros",
      "Lazer dos Filhos",
      "Roupas e Calçados dos Filhos",
      "Mesada e Gastos Extras",
      "Brinquedos e Jogos",
      "Saúde dos Filhos e Farmácia",
    ],
  },
  {
    name: "Vestuário e Cuidados Pessoais",
    type: CategoryType.DESPESA,
    children: [
      "Roupas",
      "Calçados",
      "Acessórios e Relógios",
      "Beleza e Estética",
      "Barbeiro e Cabeleireiro",
    ],
  },
  {
    name: "Presentes e Doações",
    type: CategoryType.DESPESA,
    children: ["Presentes", "Doações", "Datas Comemorativas"],
  },
  {
    name: "Tarifas Bancárias",
    type: CategoryType.DESPESA,
    children: ["Anuidades", "Tarifas de Conta", "Programas de Pontos", "Pacotes de Serviços"],
  },
  {
    name: "Encargos e Financiamentos",
    type: CategoryType.DESPESA,
    children: [
      "Juros",
      "Multas",
      "IOF",
      "Parcelamento de Fatura",
      "Crédito Rotativo",
      "Taxas de Financiamento",
    ],
  },
  {
    name: "Patrimônio",
    type: CategoryType.DESPESA,
    children: [
      "Financiamento de Veículo",
      "Financiamento Imobiliário",
      "Consórcio",
      "Amortização",
      "Investimentos",
      "Aporte Patrimonial",
    ],
  },
] as const;
