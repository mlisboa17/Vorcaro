import type { RuleAction, RuleCondition } from "@/modules/financial-inbox/domain/schemas/user-rule.schema";

/** Marcador em `UserRule.description` para regras pré-definidas do sistema. */
export const SYSTEM_DEFAULT_RULE_DESCRIPTION = "source:system-default-rules";

export const SYSTEM_DEFAULT_RULE_PRIORITY = 50;

/** @deprecated Keywords removidos por colisão com delivery — ver `rule-match-guards`. */
export const DEPRECATED_MOBILITY_KEYWORDS = ["UBER", "99"] as const;

export type DefaultCategorizationRuleTemplate = {
  groupId: string;
  groupLabel: string;
  keywords: readonly string[];
  /** Subcategoria Vorcaro (nome exato na taxonomia). */
  subcategory: string;
  /** Categoria raiz Vorcaro (validação / documentação). */
  rootCategory: string;
};

/**
 * Mapeamento adaptado à taxonomia Vorcaro (`vorcaro-category-taxonomy.ts`).
 * Spec original usava rótulos genéricos (ex.: Entretenimento → Lazer).
 */
export const DEFAULT_CATEGORIZATION_RULE_GROUPS: readonly DefaultCategorizationRuleTemplate[] =
  [
    {
      groupId: "streaming",
      groupLabel: "Streaming",
      rootCategory: "Lazer",
      subcategory: "Streaming",
      keywords: [
        "NETFLIX",
        "SPOTIFY",
        "DISNEY",
        "MAX",
        "HBO",
        "AMAZON PRIME",
        "PRIME VIDEO",
        "YOUTUBE PREMIUM",
        "APPLE TV",
      ],
    },
    {
      groupId: "ai-tools",
      groupLabel: "Ferramentas de IA",
      rootCategory: "Tecnologia e Serviços Digitais",
      subcategory: "Inteligência Artificial",
      keywords: [
        "OPENAI",
        "CHATGPT",
        "ANTHROPIC",
        "CLAUDE",
        "CURSOR",
        "PERPLEXITY",
        "LOVABLE",
        "GITHUB COPILOT",
      ],
    },
    {
      groupId: "delivery",
      groupLabel: "Delivery",
      rootCategory: "Alimentação",
      subcategory: "Delivery",
      keywords: ["IFOOD", "RAPPI", "99FOOD", "UBER EATS"],
    },
    {
      groupId: "mobility",
      groupLabel: "Mobilidade",
      rootCategory: "Transporte",
      subcategory: "Uber e Aplicativos",
      keywords: ["UBER TRIP", "UBER*TRIP", "99APP", "99 POP", "99TAXI", "CABIFY", "BUSER"],
    },
    {
      groupId: "cloud",
      groupLabel: "Infraestrutura Cloud",
      rootCategory: "Tecnologia e Serviços Digitais",
      subcategory: "Hospedagem e Domínios",
      keywords: [
        "AWS",
        "AMAZON WEB SERVICES",
        "AZURE",
        "GOOGLE CLOUD",
        "GCP",
        "DIGITALOCEAN",
        "VERCEL",
        "RAILWAY",
        "RENDER",
        "SUPABASE",
        "NEON",
      ],
    },
    {
      groupId: "grocery",
      groupLabel: "Supermercado",
      rootCategory: "Alimentação",
      subcategory: "Mercado",
      keywords: [
        "CARREFOUR",
        "EXTRA",
        "ASSAI",
        "ATACADAO",
        "PAO DE ACUCAR",
        "MERCADO",
        "SUPERMERCADO",
        "HORTIFRUTI",
      ],
    },
    {
      groupId: "pharmacy",
      groupLabel: "Farmácia",
      rootCategory: "Saúde",
      subcategory: "Farmácia",
      keywords: ["DROGASIL", "DROGA RAIA", "DROGARIA", "FARMACIA", "PACHECO", "SAO PAULO"],
    },
    {
      groupId: "bank-fees",
      groupLabel: "Tarifas e Encargos",
      rootCategory: "Tarifas Bancárias",
      subcategory: "Tarifas de Conta",
      keywords: ["TARIFA", "ANUIDADE"],
    },
    {
      groupId: "bank-charges",
      groupLabel: "IOF e Juros",
      rootCategory: "Encargos e Financiamentos",
      subcategory: "IOF",
      keywords: ["IOF", "JUROS", "ENCARGO"],
    },
  ];

export type DefaultRuleDraft = {
  name: string;
  description: string;
  priority: number;
  condition: RuleCondition;
  action: RuleAction;
  groupId: string;
  keyword: string;
};

export function buildDefaultRuleDrafts(): DefaultRuleDraft[] {
  const drafts: DefaultRuleDraft[] = [];

  for (const group of DEFAULT_CATEGORIZATION_RULE_GROUPS) {
    for (const keyword of group.keywords) {
      const condition: RuleCondition = {
        field: "description",
        operator: "contains",
        value: keyword,
      };
      const action: RuleAction = {
        set: "category",
        value: group.subcategory,
      };

      drafts.push({
        groupId: group.groupId,
        keyword,
        name: `[Sistema] ${group.groupLabel} · ${keyword}`,
        description: `${SYSTEM_DEFAULT_RULE_DESCRIPTION}:${group.groupId}:${keyword}`,
        priority: SYSTEM_DEFAULT_RULE_PRIORITY,
        condition,
        action,
      });
    }
  }

  return drafts;
}

export function ruleFingerprint(
  condition: RuleCondition,
  action: RuleAction,
): string {
  return `${condition.field}|${condition.operator}|${condition.value.toLowerCase()}|${action.set}|${String(action.value).toLowerCase()}`;
}

export function isSystemDefaultRuleDescription(description: string | null | undefined): boolean {
  return (description ?? "").startsWith(SYSTEM_DEFAULT_RULE_DESCRIPTION);
}
