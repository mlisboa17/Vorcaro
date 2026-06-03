import type { InboxClassificationSuggestion } from "./inbox-classification";

/** Confiança ≥ 95% — classificar e efetivar automaticamente. */
export const AUTO_EFFECTUATE_THRESHOLD = 95;

/** Confiança 80–94% — confirmação em lote. */
export const BATCH_CONFIRM_THRESHOLD = 80;

export type AutomationTier = "auto" | "batch" | "individual" | "manual";

export function resolveAutomationTier(
  confidence: number,
  hasCategory: boolean,
): AutomationTier {
  if (!hasCategory) return "manual";
  if (confidence >= AUTO_EFFECTUATE_THRESHOLD) return "auto";
  if (confidence >= BATCH_CONFIRM_THRESHOLD) return "batch";
  if (confidence > 0) return "individual";
  return "manual";
}

export type CategoryGroupSummary = {
  label: string;
  count: number;
  inboxItemIds: string[];
};

export type SmartBatchTierPlan = {
  inboxItemIds: string[];
  groups: CategoryGroupSummary[];
};

export type InboxSmartBatchPlan = {
  auto: SmartBatchTierPlan;
  batch: SmartBatchTierPlan;
  individual: { inboxItemIds: string[] };
  manual: { inboxItemIds: string[] };
  totalReviewable: number;
};

export type ClassifiedInboxItem = {
  inboxItemId: string;
  suggestion: InboxClassificationSuggestion | null | undefined;
};

export function formatCategoryGroupLabel(
  suggestion: InboxClassificationSuggestion,
): string {
  if (suggestion.categoriaPrincipal && suggestion.subcategoria) {
    return `${suggestion.categoriaPrincipal} > ${suggestion.subcategoria}`;
  }
  return suggestion.categoryName ?? suggestion.categoriaPrincipal ?? "Sem categoria";
}

function buildGroups(items: ClassifiedInboxItem[]): CategoryGroupSummary[] {
  const map = new Map<string, CategoryGroupSummary>();

  for (const item of items) {
    if (!item.suggestion?.categoryId) continue;

    const label = formatCategoryGroupLabel(item.suggestion);
    const existing = map.get(label);

    if (existing) {
      existing.count += 1;
      existing.inboxItemIds.push(item.inboxItemId);
    } else {
      map.set(label, {
        label,
        count: 1,
        inboxItemIds: [item.inboxItemId],
      });
    }
  }

  return [...map.values()].sort((left, right) => right.count - left.count);
}

export function buildInboxSmartBatchPlan(
  items: readonly ClassifiedInboxItem[],
): InboxSmartBatchPlan {
  const autoItems: ClassifiedInboxItem[] = [];
  const batchItems: ClassifiedInboxItem[] = [];
  const individualIds: string[] = [];
  const manualIds: string[] = [];

  for (const item of items) {
    const suggestion = item.suggestion;
    const tier = resolveAutomationTier(
      suggestion?.confidence ?? 0,
      Boolean(suggestion?.categoryId),
    );

    switch (tier) {
      case "auto":
        autoItems.push(item);
        break;
      case "batch":
        batchItems.push(item);
        break;
      case "individual":
        individualIds.push(item.inboxItemId);
        break;
      default:
        manualIds.push(item.inboxItemId);
        break;
    }
  }

  return {
    auto: {
      inboxItemIds: autoItems.map((entry) => entry.inboxItemId),
      groups: buildGroups(autoItems),
    },
    batch: {
      inboxItemIds: batchItems.map((entry) => entry.inboxItemId),
      groups: buildGroups(batchItems),
    },
    individual: { inboxItemIds: individualIds },
    manual: { inboxItemIds: manualIds },
    totalReviewable: items.length,
  };
}

export function summarizeCategoryGroups(
  groups: readonly CategoryGroupSummary[],
  maxVisible = 4,
): CategoryGroupSummary[] {
  if (groups.length <= maxVisible) return [...groups];

  const visible = groups.slice(0, maxVisible);
  const rest = groups.slice(maxVisible);
  const otherCount = rest.reduce((sum, group) => sum + group.count, 0);
  const otherIds = rest.flatMap((group) => group.inboxItemIds);

  return [
    ...visible,
    {
      label: "Outras categorias",
      count: otherCount,
      inboxItemIds: otherIds,
    },
  ];
}

export function buildAutomationMessages(plan: InboxSmartBatchPlan): {
  auto?: string;
  batch?: string;
  individual?: string;
} {
  const messages: {
    auto?: string;
    batch?: string;
    individual?: string;
  } = {};

  if (plan.auto.inboxItemIds.length > 0) {
    messages.auto = `Classifiquei automaticamente ${plan.auto.inboxItemIds.length} transação${plan.auto.inboxItemIds.length === 1 ? "" : "ões"} utilizando seu histórico e regras aprendidas.`;
  }

  if (plan.batch.inboxItemIds.length > 0) {
    messages.batch = `Identifiquei ${plan.batch.inboxItemIds.length} transação${plan.batch.inboxItemIds.length === 1 ? "" : "ões"} com alta probabilidade de classificação correta. Deseja efetivar todas?`;
  }

  const autoCount = plan.auto.inboxItemIds.length;
  const uncertainCount = plan.individual.inboxItemIds.length + plan.manual.inboxItemIds.length;

  if (autoCount > 0 && uncertainCount > 0) {
    messages.individual = `${autoCount} transação${autoCount === 1 ? "" : "ões"} ${autoCount === 1 ? "foi classificada" : "foram classificadas"} automaticamente. Restam ${uncertainCount} transação${uncertainCount === 1 ? "" : "ões"} que precisam da sua ajuda.`;
  } else if (uncertainCount > 0) {
    messages.individual = `Restam ${uncertainCount} transação${uncertainCount === 1 ? "" : "ões"} que precisam da sua ajuda.`;
  }

  return messages;
}
