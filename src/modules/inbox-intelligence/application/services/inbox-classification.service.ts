import type { PrismaClient } from "@prisma/client";
import { AiRouterService } from "@/modules/ai/application/services/ai-router.service";
import type { ExtractedTransactionType } from "@/modules/financial-inbox/domain/ports/ai-service.port";
import { extractLearningKeyword } from "@/modules/financial-inbox/domain/utils/learning-keyword";
import {
  parseLearningOutputSignal,
  parseRuleAction,
  parseRuleCondition,
} from "@/modules/financial-inbox/domain/schemas/user-rule.schema";
import {
  buildInboxClassificationCategoryContext,
  type CategoryHistoryHint,
} from "@/lib/categories/inbox-classification-category-context";
import { normalizeCategoryName } from "@/lib/categories/category-name-normalizer";
import {
  READY_TO_CONFIRM_THRESHOLD,
  type ClassificationSource,
  type InboxClassificationSuggestion,
} from "../../domain/types/inbox-classification";
import { bestMerchantMatch, normalizeMerchantText } from "../../domain/services/merchant-similarity";
import { detectPossibleDuplicate } from "../../domain/services/detect-possible-duplicate";
import { detectPotentialReimbursement } from "../../domain/services/detect-potential-reimbursement";
import { buildInstallmentClassificationHint } from "../../domain/services/installment-classification-hint";

const KEYWORD_RULES: Array<{
  keyword: RegExp;
  categoriaPrincipal: string;
  subcategoria: string;
  confidence: number;
  reason: string;
}> = [
  {
    keyword: /\bifood\b/i,
    categoriaPrincipal: "Alimentação",
    subcategoria: "iFood",
    confidence: 88,
    reason: "Regra por palavra-chave IFOOD.",
  },
  {
    keyword: /\b(uber|99app|99\s+taxi)\b/i,
    categoriaPrincipal: "Transporte",
    subcategoria: "Uber",
    confidence: 86,
    reason: "Regra por palavra-chave UBER.",
  },
  {
    keyword: /\b(posto|shell|ipiranga|combust[ií]vel)\b/i,
    categoriaPrincipal: "Transporte",
    subcategoria: "Combustível",
    confidence: 85,
    reason: "Regra por palavra-chave de combustível.",
  },
  {
    keyword: /\b(drogaria|farmacia|farmácia)\b/i,
    categoriaPrincipal: "Saúde",
    subcategoria: "Farmácia",
    confidence: 84,
    reason: "Regra por palavra-chave FARMACIA.",
  },
  {
    keyword: /\b(netflix|spotify)\b/i,
    categoriaPrincipal: "Lazer",
    subcategoria: "Streaming",
    confidence: 83,
    reason: "Regra por palavra-chave de streaming.",
  },
  {
    keyword: /\b(outback|coco\s+bambu|parmegiano|restaurante|lanchonete|pizza|burger)\b/i,
    categoriaPrincipal: "Alimentação",
    subcategoria: "Restaurantes",
    confidence: 82,
    reason: "Regra por palavra-chave de restaurante.",
  },
  {
    keyword: /\b(aluguel|condom[ií]nio|energia|luz|água|agua|internet|fortlev)\b/i,
    categoriaPrincipal: "Moradia",
    subcategoria: "Energia",
    confidence: 78,
    reason: "Regra por palavra-chave de moradia/utilidades.",
  },
];

type CategoryRow = {
  id: string;
  name: string;
  parentCategoryId: string | null;
};

type LearningPatternRow = {
  patternType: string;
  inputSignal: unknown;
  outputSignal: unknown;
  occurrences: number;
  confidence: number;
};

type AiCategoryJson = {
  categoriaPrincipal: string;
  subcategoria?: string | null;
  expenseType?: ExtractedTransactionType;
  confidence?: number;
};

export type ClassifyInboxItemInput = {
  userId: string;
  description: string;
  rawContent?: string;
  inboxItemId?: string;
  amount?: number | null;
  date?: string | null;
  cardId?: string | null;
  importHash?: string | null;
};

export class InboxClassificationService {
  constructor(
    private readonly db: PrismaClient,
    private readonly aiRouter: AiRouterService = new AiRouterService(),
  ) {}

  async classify(input: ClassifyInboxItemInput): Promise<InboxClassificationSuggestion> {
    const text = (input.description || input.rawContent || "").trim();
    if (!text) {
      return this.emptySuggestion("Descrição vazia para classificação.");
    }

    const [patterns, categories, userRules, duplicateCandidates] = await Promise.all([
      this.db.userLearningPattern.findMany({
        where: {
          userId: input.userId,
          patternType: { in: ["categorization_preference", "classification_correction"] },
        },
        orderBy: [{ occurrences: "desc" }, { confidence: "desc" }],
      }),
      this.db.category.findMany({
        where: { userId: input.userId, isActive: true },
        select: { id: true, name: true, parentCategoryId: true },
      }),
      this.db.userRule.findMany({
        where: { userId: input.userId, isActive: true },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      }),
      this.loadDuplicateCandidates(input.userId, input.inboxItemId),
    ]);

    const keyword = extractLearningKeyword(text).toLowerCase();
    const searchable = `${text} ${input.rawContent ?? ""}`.toLowerCase();

    const installment = buildInstallmentClassificationHint({
      userId: input.userId,
      description: text,
      rawContent: input.rawContent,
      amount: input.amount,
      cardId: input.cardId,
      purchaseDate: input.date ?? null,
    });

    const reimbursement = detectPotentialReimbursement(searchable);
    const duplicate = detectPossibleDuplicate({
      description: text,
      rawContent: input.rawContent,
      amount: input.amount,
      date: input.date,
      cardId: input.cardId,
      importHash: input.importHash,
      candidates: duplicateCandidates,
      excludeId: input.inboxItemId,
    });

    const enrich = (
      base: InboxClassificationSuggestion,
    ): InboxClassificationSuggestion => ({
      ...base,
      installment,
      possibleDuplicate: duplicate.possibleDuplicate || undefined,
      duplicateReason: duplicate.duplicateReason ?? undefined,
      duplicateConfidence: duplicate.duplicateConfidence || undefined,
      isPotentialReimbursement: reimbursement.isPotentialReimbursement || undefined,
      reimbursementReason: reimbursement.reimbursementReason ?? undefined,
      reimbursementConfidence: reimbursement.reimbursementConfidence || undefined,
    });

    const history = this.matchHistory(patterns, searchable, keyword, categories);
    if (history) return enrich(history);

    const similarity = this.matchSimilarity(patterns, text, categories);
    if (similarity) return enrich(similarity);

    const userRule = this.matchUserRules(userRules, text, input.rawContent ?? text, categories);
    if (userRule) return enrich(userRule);

    const keywordRule = this.matchKeywordRule(text, categories);
    if (keywordRule) return enrich(keywordRule);

    const ai = await this.classifyWithAi(input.userId, text, categories, patterns);
    return enrich(ai);
  }

  async classifyBatch(input: {
    userId: string;
    items: Array<Omit<ClassifyInboxItemInput, "userId"> & { inboxItemId: string }>;
  }): Promise<Record<string, InboxClassificationSuggestion>> {
    const result: Record<string, InboxClassificationSuggestion> = {};

    for (const item of input.items) {
      result[item.inboxItemId] = await this.classify({
        userId: input.userId,
        inboxItemId: item.inboxItemId,
        description: item.description,
        rawContent: item.rawContent,
        amount: item.amount,
        date: item.date,
        cardId: item.cardId,
        importHash: item.importHash,
      });
    }

    return result;
  }

  private async loadDuplicateCandidates(userId: string, excludeInboxId?: string) {
    const since = new Date();
    since.setDate(since.getDate() - 90);

    const [transactions, inboxPeers] = await Promise.all([
      this.db.transaction.findMany({
        where: { userId, date: { gte: since } },
        select: {
          id: true,
          description: true,
          amount: true,
          date: true,
          cardId: true,
        },
        take: 200,
        orderBy: { date: "desc" },
      }),
      this.db.financialInbox.findMany({
        where: {
          userId,
          ...(excludeInboxId ? { id: { not: excludeInboxId } } : {}),
          status: { in: ["READY", "NEEDS_CONFIRMATION", "SAVED"] },
        },
        select: {
          id: true,
          rawContent: true,
          importHash: true,
          metadata: true,
        },
        take: 100,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const txCandidates = transactions.map((tx) => ({
      id: tx.id,
      description: tx.description,
      amount: tx.amount.toNumber(),
      date: tx.date.toISOString().slice(0, 10),
      cardId: tx.cardId,
    }));

    const inboxCandidates = inboxPeers.map((item) => {
      const meta = item.metadata as { amount?: number; date?: string; cartaoId?: string } | null;
      return {
        id: item.id,
        description: item.rawContent,
        amount: typeof meta?.amount === "number" ? meta.amount : null,
        date: meta?.date ?? null,
        cardId: meta?.cartaoId ?? null,
        importHash: item.importHash,
      };
    });

    return [...txCandidates, ...inboxCandidates];
  }

  private matchHistory(
    patterns: LearningPatternRow[],
    searchable: string,
    keyword: string,
    categories: CategoryRow[],
  ): InboxClassificationSuggestion | null {
    for (const pattern of patterns) {
      const inputSignal = pattern.inputSignal as { keyword?: string };
      const patternKeyword = inputSignal?.keyword?.toLowerCase();
      if (!patternKeyword) continue;

      const exact =
        searchable.includes(patternKeyword) ||
        patternKeyword === keyword ||
        normalizeMerchantText(searchable).includes(normalizeMerchantText(patternKeyword));

      if (!exact) continue;

      const output = parseLearningOutputSignal(pattern.outputSignal);
      if (!output?.categoryId && !output?.category) continue;

      const resolved = this.resolveCategory(
        categories,
        output.categoryId,
        output.category,
        null,
        null,
      );
      if (!resolved.categoryId) continue;

      const occurrences = pattern.occurrences;
      const isCorrection = pattern.patternType === "classification_correction";
      const confidence = Math.min(
        100,
        isCorrection
          ? 96
          : Math.round(95 + Math.min(occurrences, 12) * 0.4 + pattern.confidence * 2),
      );

      const label = isCorrection ? "correção anterior" : `${occurrences} lançamento(s) anterior(es)`;

      return this.buildSuggestion({
        ...resolved,
        confidence,
        source: "history",
        explanation: `Baseado em ${label} classificados como ${resolved.categoryName ?? "esta categoria"}.`,
        historyMatchCount: occurrences,
        expenseType: output.type ?? "EXPENSE",
      });
    }

    return null;
  }

  private matchSimilarity(
    patterns: LearningPatternRow[],
    description: string,
    categories: CategoryRow[],
  ): InboxClassificationSuggestion | null {
    const candidates = patterns
      .map((pattern) => {
        const inputSignal = pattern.inputSignal as { keyword?: string };
        const kw = inputSignal?.keyword ?? "";
        return { keyword: kw, score: pattern.occurrences };
      })
      .filter((c) => c.keyword.length > 0);

    const match = bestMerchantMatch(description, candidates, 0.42);
    if (!match) return null;

    const pattern = patterns.find((p) => {
      const kw = (p.inputSignal as { keyword?: string })?.keyword ?? "";
      return kw.toLowerCase() === match.keyword.toLowerCase();
    });

    if (!pattern) return null;

    const output = parseLearningOutputSignal(pattern.outputSignal);
    if (!output?.categoryId && !output?.category) return null;

    const resolved = this.resolveCategory(
      categories,
      output.categoryId,
      output.category,
      null,
      null,
    );
    if (!resolved.categoryId) return null;

    const confidence = Math.min(94, Math.round(80 + match.similarity * 14));

    return this.buildSuggestion({
      ...resolved,
      confidence,
      source: "similarity",
      explanation: `Fornecedor parecido com "${match.keyword}" (${Math.round(match.similarity * 100)}% de correspondência).`,
      historyMatchCount: pattern.occurrences,
      expenseType: output.type ?? "EXPENSE",
    });
  }

  private matchUserRules(
    rules: Array<{ name: string; condition: unknown; action: unknown }>,
    description: string,
    rawContent: string,
    categories: CategoryRow[],
  ): InboxClassificationSuggestion | null {
    const context = {
      description: description.toLowerCase(),
      rawContent: rawContent.toLowerCase(),
      category: "",
      paymentMethod: "",
    };

    for (const rule of rules) {
      const condition = parseRuleCondition(rule.condition);
      const action = parseRuleAction(rule.action);
      if (!condition || !action || action.set !== "category") continue;
      if (!this.matchesRuleCondition(condition, context)) continue;

      const categoryValue = String(action.value);
      const resolved = this.resolveCategory(categories, null, categoryValue, null, null);
      if (!resolved.categoryId) continue;

      return this.buildSuggestion({
        ...resolved,
        confidence: 90,
        source: "rule",
        explanation: `Regra personalizada "${rule.name}".`,
        expenseType: "EXPENSE",
      });
    }

    return null;
  }

  private matchesRuleCondition(
    condition: { operator: string; field: string; value: string },
    context: { description: string; rawContent: string; category: string; paymentMethod: string },
  ): boolean {
    const fieldValue = context[condition.field as keyof typeof context] ?? "";
    const needle = condition.value.toLowerCase();

    if (condition.operator === "equals") {
      return fieldValue === needle;
    }

    return fieldValue.includes(needle);
  }

  private matchKeywordRule(
    description: string,
    categories: CategoryRow[],
  ): InboxClassificationSuggestion | null {
    const normalized = description.toLowerCase();
    const rule = KEYWORD_RULES.find((entry) => entry.keyword.test(normalized));
    if (!rule) return null;

    const resolved = this.resolveCategory(
      categories,
      null,
      null,
      rule.categoriaPrincipal,
      rule.subcategoria,
    );
    if (!resolved.categoryId) return null;

    return this.buildSuggestion({
      ...resolved,
      confidence: rule.confidence,
      source: "rule",
      explanation: rule.reason,
      expenseType: "EXPENSE",
    });
  }

  private async classifyWithAi(
    userId: string,
    description: string,
    categories: CategoryRow[],
    patterns: LearningPatternRow[],
  ): Promise<InboxClassificationSuggestion> {
    const historyHints: CategoryHistoryHint[] = patterns
      .slice(0, 8)
      .map((pattern) => {
        const keyword = (pattern.inputSignal as { keyword?: string })?.keyword ?? "";
        const output = parseLearningOutputSignal(pattern.outputSignal);
        let categoryName = output?.category ?? "—";

        if (output?.categoryId) {
          const category = categories.find((entry) => entry.id === output.categoryId);
          if (category) {
            const parent = category.parentCategoryId
              ? categories.find((entry) => entry.id === category.parentCategoryId)
              : null;
            categoryName = parent
              ? `${parent.name} → ${category.name}`
              : category.name;
          }
        }

        return {
          keyword,
          categoryName,
          occurrences: pattern.occurrences,
        };
      })
      .filter((hint) => hint.keyword.length > 0);

    const categoryContext = buildInboxClassificationCategoryContext(categories, historyHints);

    try {
      const result = await this.aiRouter.generateJson<AiCategoryJson>({
        system:
          "Você classifica lançamentos financeiros pessoais usando a taxonomia Vorcaro. Responda somente JSON válido. Não efetive nada — apenas sugira categoriaPrincipal e subcategoria exatamente como listadas.",
        prompt: `Descrição: "${description}"\n\n${categoryContext}\n\nRetorne categoriaPrincipal, subcategoria, expenseType (EXPENSE|INCOME|TRANSFER), confidence (0-100). Use nomes exatos da taxonomia.`,
        temperature: 0.1,
      });

      const resolved = this.resolveCategory(
        categories,
        null,
        null,
        result.data.categoriaPrincipal,
        result.data.subcategoria ?? null,
      );

      const confidence = Math.min(75, Math.max(40, Math.round(result.data.confidence ?? 62)));

      return this.buildSuggestion({
        ...resolved,
        confidence,
        source: "ai",
        explanation: `Sugestão feita por IA (${result.provider}).`,
        expenseType: result.data.expenseType ?? "EXPENSE",
      });
    } catch {
      return this.emptySuggestion("Não foi possível classificar com IA no momento.");
    }
  }

  private resolveCategory(
    categories: CategoryRow[],
    categoryId: string | null | undefined,
    categoryLabel: string | null | undefined,
    categoriaPrincipal: string | null,
    subcategoria: string | null,
  ) {
    if (categoryId) {
      const cat = categories.find((c) => c.id === categoryId);
      if (cat) {
        const parent = cat.parentCategoryId
          ? categories.find((c) => c.id === cat.parentCategoryId)
          : null;
        return {
          categoryId: cat.id,
          subcategoriaId: parent ? cat.id : null,
          categoriaPrincipal: parent?.name ?? cat.name,
          subcategoria: parent ? cat.name : null,
          categoryName: parent ? `${parent.name} → ${cat.name}` : cat.name,
        };
      }
    }

    const parent = categoriaPrincipal
      ? categories.find(
          (c) =>
            !c.parentCategoryId &&
            normalizeCategoryName(c.name) === normalizeCategoryName(categoriaPrincipal),
        )
      : null;

    const sub =
      subcategoria && parent
        ? categories.find(
            (c) =>
              c.parentCategoryId === parent.id &&
              normalizeCategoryName(c.name) === normalizeCategoryName(subcategoria),
          )
        : null;

    const resolvedId = sub?.id ?? parent?.id ?? null;

    if (categoryLabel && !resolvedId) {
      const byLabel = categories.find(
        (c) => normalizeCategoryName(c.name) === normalizeCategoryName(categoryLabel),
      );
      if (byLabel) {
        const p = byLabel.parentCategoryId
          ? categories.find((c) => c.id === byLabel.parentCategoryId)
          : null;
        return {
          categoryId: byLabel.id,
          subcategoriaId: p ? byLabel.id : null,
          categoriaPrincipal: p?.name ?? byLabel.name,
          subcategoria: p ? byLabel.name : null,
          categoryName: p ? `${p.name} → ${byLabel.name}` : byLabel.name,
        };
      }
    }

    return {
      categoryId: resolvedId,
      subcategoriaId: sub?.id ?? null,
      categoriaPrincipal: parent?.name ?? categoriaPrincipal,
      subcategoria: sub?.name ?? subcategoria,
      categoryName: sub
        ? `${parent!.name} → ${sub.name}`
        : parent?.name ?? categoryLabel ?? categoriaPrincipal,
    };
  }

  private buildSuggestion(params: {
    categoryId: string | null;
    subcategoriaId?: string | null;
    categoriaPrincipal: string | null;
    subcategoria: string | null;
    categoryName: string | null;
    accountId?: string | null;
    cardId?: string | null;
    paymentMethodId?: string | null;
    confidence: number;
    source: ClassificationSource;
    explanation: string;
    expenseType?: ExtractedTransactionType | null;
    historyMatchCount?: number;
  }): InboxClassificationSuggestion {
    const confidence = Math.max(0, Math.min(100, params.confidence));
    const readyToConfirm = confidence >= READY_TO_CONFIRM_THRESHOLD && Boolean(params.categoryId);
    const explanation = params.explanation;

    return {
      categoryId: params.categoryId,
      subcategoriaId: params.subcategoriaId ?? null,
      categoriaPrincipal: params.categoriaPrincipal,
      subcategoria: params.subcategoria,
      categoryName: params.categoryName,
      accountId: params.accountId ?? null,
      cardId: params.cardId ?? null,
      paymentMethodId: params.paymentMethodId ?? null,
      expenseType: params.expenseType ?? "EXPENSE",
      confidence,
      source: params.source,
      explanation,
      reason: explanation,
      readyToConfirm,
      historyMatchCount: params.historyMatchCount,
    };
  }

  private emptySuggestion(explanation: string): InboxClassificationSuggestion {
    return this.buildSuggestion({
      categoryId: null,
      subcategoriaId: null,
      categoriaPrincipal: null,
      subcategoria: null,
      categoryName: null,
      confidence: 0,
      source: "ai",
      explanation,
      expenseType: "EXPENSE",
    });
  }
}
