import { CategoryType } from "@prisma/client";

export type CategoryTaxonomyEntry = {
  name: string;
  type: CategoryType;
  children: readonly string[];
};

/**
 * Taxonomia oficial Vorcaro — categorias e subcategorias mais tradicionais do Brasil.
 * Idempotente via seed-category-taxonomy; nomes canônicos preservados para regras existentes.
 */
export const VORCARO_CATEGORY_TAXONOMY: readonly CategoryTaxonomyEntry[] = [
  // ─── RECEITAS ────────────────────────────────────────────────────────────────
  {
    name: "Receita",
    type: CategoryType.RECEITA,
    children: [
      "Salário",
      "Pró-labore",
      "Comissão",
      "Bônus e Gratificação",
      "13º Salário",
      "Férias",
      "Freelance",
      "Dividendos",
      "JCP",
      "Aluguel Recebido",
      "Rendimentos de Investimentos",
      "Venda de Ativos",
      "Reembolso",
      "Auxílio Empresa",
      "Vale Refeição / Alimentação",
      "Pensão Recebida",
      "Herança",
      "Prêmios e Sorteios",
      "Outras Receitas",
    ],
  },

  // ─── MORADIA ─────────────────────────────────────────────────────────────────
  {
    name: "Moradia",
    type: CategoryType.DESPESA,
    children: [
      "Aluguel",
      "Financiamento Imobiliário",
      "Condomínio",
      "IPTU",
      "Energia Elétrica",
      "Água e Esgoto",
      "Gás",
      "Internet",
      "TV a Cabo",
      "Manutenção e Reformas",
      "Materiais de Construção",
      "Mobília e Decoração",
      "Eletrodomésticos",
      "Seguro Residencial",
      "Serviços Domésticos",
      "Funcionária Doméstica",
      "Jardinagem e Piscina",
    ],
  },

  // ─── ALIMENTAÇÃO ─────────────────────────────────────────────────────────────
  {
    name: "Alimentação",
    type: CategoryType.DESPESA,
    children: [
      "Mercado / Supermercado",
      "Açougue e Peixaria",
      "Feira e Hortifrúti",
      "Padaria",
      "Restaurantes",
      "Delivery / iFood / Rappi",
      "Fast Food",
      "Cafés e Lanchonetes",
      "Bebidas",
      "Marmita e Quentinha",
    ],
  },

  // ─── TRANSPORTE ──────────────────────────────────────────────────────────────
  {
    name: "Transporte",
    type: CategoryType.DESPESA,
    children: [
      "Combustível",
      "Uber e Aplicativos de Corrida",
      "Táxi",
      "Ônibus e Metrô",
      "Estacionamento",
      "Pedágio",
      "Manutenção e Revisão",
      "Pneus e Peças",
      "Lavagem",
      "Seguro Auto",
      "IPVA e Licenciamento",
      "Multas de Trânsito",
      "Financiamento de Veículo",
    ],
  },

  // ─── SAÚDE ───────────────────────────────────────────────────────────────────
  {
    name: "Saúde",
    type: CategoryType.DESPESA,
    children: [
      "Plano de Saúde",
      "Consultas Médicas",
      "Exames Laboratoriais e Imagem",
      "Farmácia e Medicamentos",
      "Dentista e Ortodontia",
      "Psicólogo e Psiquiatra",
      "Fisioterapia",
      "Nutricionista",
      "Academia e Musculação",
      "Esportes e Atividades Físicas",
      "Óculos e Lentes",
      "Cirurgias e Procedimentos",
      "Plano Odontológico",
      "Vacinas",
      "Suplementos",
    ],
  },

  // ─── EDUCAÇÃO ────────────────────────────────────────────────────────────────
  {
    name: "Educação",
    type: CategoryType.DESPESA,
    children: [
      "Escola Particular",
      "Faculdade / Universidade",
      "Pós-graduação / MBA",
      "Cursos Online",
      "Cursos Presenciais",
      "Idiomas",
      "Livros e Material Didático",
      "Papelaria e Material Escolar",
      "Transporte Escolar",
      "Uniforme Escolar",
    ],
  },

  // ─── COMUNICAÇÃO ─────────────────────────────────────────────────────────────
  {
    name: "Comunicação",
    type: CategoryType.DESPESA,
    children: [
      "Plano de Celular",
      "Telefone Fixo",
      "Recarga de Celular",
    ],
  },

  // ─── LAZER E ENTRETENIMENTO ──────────────────────────────────────────────────
  {
    name: "Lazer e Entretenimento",
    type: CategoryType.DESPESA,
    children: [
      "Cinema e Teatro",
      "Shows e Eventos",
      "Ingressos e Festas",
      "Bares e Pubs",
      "Streaming (Netflix, Spotify...)",
      "Games e Consoles",
      "Brinquedos e Hobbies",
      "Livros e Revistas",
      "Zé Delivery / Bebidas",
      "Passeios e Turismo Local",
    ],
  },

  // ─── VIAGENS ─────────────────────────────────────────────────────────────────
  {
    name: "Viagens",
    type: CategoryType.DESPESA,
    children: [
      "Passagens Aéreas",
      "Passagens de Ônibus / Trem",
      "Hotéis e Hospedagem",
      "Airbnb e Temporada",
      "Aluguel de Carro",
      "Pacotes de Viagem",
      "Passeios e Excursões",
      "Alimentação em Viagem",
      "Seguro Viagem",
    ],
  },

  // ─── VESTUÁRIO E CUIDADOS PESSOAIS ───────────────────────────────────────────
  {
    name: "Vestuário e Cuidados Pessoais",
    type: CategoryType.DESPESA,
    children: [
      "Roupas",
      "Calçados",
      "Acessórios e Bolsas",
      "Relógios e Joias",
      "Salão de Beleza e Estética",
      "Barbeiro e Cabeleireiro",
      "Farmácia de Beleza / Cosméticos",
      "Manicure e Pedicure",
      "Perfumes e Fragrâncias",
    ],
  },

  // ─── FAMÍLIA E FILHOS ────────────────────────────────────────────────────────
  {
    name: "Família e Filhos",
    type: CategoryType.DESPESA,
    children: [
      "Mensalidade Escolar dos Filhos",
      "Material Escolar e Livros",
      "Transporte Escolar",
      "Uniforme Escolar",
      "Cursos e Atividades Extracurriculares",
      "Roupas e Calçados dos Filhos",
      "Brinquedos e Jogos",
      "Saúde dos Filhos",
      "Lazer dos Filhos",
      "Mesada",
      "Presentes e Datas Comemorativas",
      "Apoio a Familiar",
      "Pensão Alimentícia",
      "Babá e Cuidados",
    ],
  },

  // ─── PETS ────────────────────────────────────────────────────────────────────
  {
    name: "Pets",
    type: CategoryType.DESPESA,
    children: [
      "Ração",
      "Veterinário",
      "Medicamentos e Vacinas",
      "Banho e Tosa",
      "Petshop",
      "Hotel e Day Care",
      "Acessórios",
    ],
  },

  // ─── PRESENTES E DOAÇÕES ─────────────────────────────────────────────────────
  {
    name: "Presentes e Doações",
    type: CategoryType.DESPESA,
    children: [
      "Presentes",
      "Datas Comemorativas",
      "Doações e Contribuições",
      "Dízimo e Oferta",
    ],
  },

  // ─── SEGUROS ─────────────────────────────────────────────────────────────────
  {
    name: "Seguros",
    type: CategoryType.DESPESA,
    children: [
      "Seguro de Vida",
      "Seguro Residencial",
      "Seguro Auto",
      "Seguro Viagem",
      "Seguro Saúde",
      "Seguro de Equipamentos",
    ],
  },

  // ─── FINANCEIRO E BANCÁRIO ───────────────────────────────────────────────────
  {
    name: "Financeiro e Bancário",
    type: CategoryType.DESPESA,
    children: [
      "Tarifas Bancárias",
      "Anuidade de Cartão",
      "Pacotes de Serviços",
      "IOF",
      "Juros e Encargos",
      "Multa por Atraso",
      "Crédito Rotativo",
      "Parcelamento de Fatura",
      "Empréstimo Pessoal",
      "Consignado",
      "Cheque Especial",
    ],
  },

  // ─── INVESTIMENTOS ───────────────────────────────────────────────────────────
  {
    name: "Investimentos",
    type: CategoryType.DESPESA,
    children: [
      "Ações e FIIs",
      "Fundos de Investimento",
      "Tesouro Direto",
      "CDB / LCI / LCA",
      "Criptoativos",
      "Previdência Privada",
      "Poupança",
      "Consórcio",
      "Aporte Patrimonial",
    ],
  },

  // ─── IMPOSTOS E TAXAS ────────────────────────────────────────────────────────
  {
    name: "Impostos e Taxas",
    type: CategoryType.DESPESA,
    children: [
      "IRPF",
      "IRPJ",
      "ISS",
      "ICMS",
      "IPTU",
      "IPVA",
      "Contribuição Sindical",
      "Taxas Municipais",
      "Cartório e Registro",
    ],
  },

  // ─── TECNOLOGIA ──────────────────────────────────────────────────────────────
  {
    name: "Tecnologia",
    type: CategoryType.DESPESA,
    children: [
      "Celular e Smartphone",
      "Computadores e Notebooks",
      "Acessórios e Periféricos",
      "Softwares e Licenças",
      "Assinaturas Digitais",
      "Hospedagem e Domínios",
      "Cloud e Armazenamento",
      "Inteligência Artificial",
      "Câmeras e Eletrônicos",
    ],
  },

  // ─── TRABALHO E NEGÓCIOS ─────────────────────────────────────────────────────
  {
    name: "Trabalho e Negócios",
    type: CategoryType.DESPESA,
    children: [
      "Material de Escritório",
      "Coworking e Aluguel Comercial",
      "Contabilidade e Assessoria",
      "Marketing e Publicidade",
      "Ferramentas e Equipamentos",
      "Transporte e Logística",
      "Treinamentos Empresariais",
    ],
  },

  // ─── PATRIMÔNIO ──────────────────────────────────────────────────────────────
  {
    name: "Patrimônio",
    type: CategoryType.DESPESA,
    children: [
      "Financiamento Imobiliário",
      "Financiamento de Veículo",
      "Consórcio",
      "Amortização de Dívida",
      "Reforma e Valorização",
    ],
  },

  // ─── TRANSFERÊNCIAS ──────────────────────────────────────────────────────────
  {
    name: "Transferências",
    type: CategoryType.RECEITA,
    children: [
      "Transferência entre Contas",
      "PIX Recebido",
      "TED / DOC Recebido",
      "Estorno Recebido",
    ],
  },
] as const;
