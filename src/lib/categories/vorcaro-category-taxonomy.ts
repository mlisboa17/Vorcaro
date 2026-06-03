import { CategoryType } from "@prisma/client";

export type CategoryTaxonomyEntry = {
  name: string;
  type: CategoryType;
  children: readonly string[];
};

/** Taxonomia oficial Vorcaro — nomes canônicos para seed e contexto de IA. */
export const VORCARO_CATEGORY_TAXONOMY: readonly CategoryTaxonomyEntry[] = [
  {
    name: "Receita",
    type: CategoryType.RECEITA,
    children: ["Salário", "Pró-labore", "Reembolso", "Rendimentos", "Outras Receitas"],
  },
  {
    name: "Alimentação",
    type: CategoryType.DESPESA,
    children: ["iFood", "Mercado", "Padaria", "Restaurantes", "Cafés e Lanches", "Delivery"],
  },
  {
    name: "Moradia",
    type: CategoryType.DESPESA,
    children: [
      "Aluguel",
      "Condomínio",
      "Energia",
      "Água",
      "Internet",
      "Funcionária",
      "Seguro Residencial",
      "Serviços Domésticos",
      "Manutenção Residencial",
    ],
  },
  {
    name: "Família e Filhos",
    type: CategoryType.DESPESA,
    children: [
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
    name: "Saúde",
    type: CategoryType.DESPESA,
    children: [
      "Plano de Saúde",
      "Remédios",
      "Consultas e Exames",
      "Dentista",
      "Academia e Esportes",
      "Terapia e Psicólogo",
      "Farmácia",
    ],
  },
  {
    name: "Transporte",
    type: CategoryType.DESPESA,
    children: [
      "Combustível",
      "Estacionamento",
      "Uber e Aplicativos",
      "IPVA e Licenciamento",
      "Seguro Auto",
      "Manutenção e Lavagem",
      "Multas e Documentação",
      "Pedágio",
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
    name: "Lazer",
    type: CategoryType.DESPESA,
    children: [
      "Cinema",
      "Streaming",
      "Zé Delivery",
      "Viagens, Hotéis e Passagens",
      "Shows, Festas e Ingressos",
      "Bares e Pubs",
      "Hospedagem e Airbnb",
    ],
  },
  {
    name: "Pets",
    type: CategoryType.DESPESA,
    children: ["Despesas Pet", "Ração", "Veterinário", "Banho e Tosa"],
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
  {
    name: "Tecnologia e Serviços Digitais",
    type: CategoryType.DESPESA,
    children: [
      "Software e Assinaturas",
      "Hospedagem e Domínios",
      "Equipamentos",
      "Aplicativos",
      "Inteligência Artificial",
    ],
  },
] as const;
