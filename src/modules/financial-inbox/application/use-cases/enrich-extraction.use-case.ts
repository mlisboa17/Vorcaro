import type { FinancialExtraction } from "../../domain/ports/ai-service.port";
import type { InstrumentLookupPort } from "@/modules/financial-instruments/domain/ports/financial-instrument.port";
import type { CategoryConfigRepositoryPort } from "@/modules/financial-config/domain/ports/category-config.port";
import { resolveCategoryIdFromNames } from "@/modules/financial-config/domain/services/category-resolver.service";
import type { UserLearningPatternRepositoryPort } from "../../domain/ports/user-learning-pattern-repository.port";
import type { UserRuleRepositoryPort } from "../../domain/ports/user-rule-repository.port";
import type { RuleAction, RuleCondition } from "../../domain/schemas/user-rule.schema";
import { isValidTransactionType } from "../../domain/schemas/user-rule.schema";

const CRITICAL_FIELDS = new Set(["amount", "type"]);
const ENRICHMENT_CONFIDENCE = 1.0;

export type EnrichmentFieldSource = "rule" | "pattern" | "instrument";

export interface EnrichExtractionInput {
  userId: string;
  extraction: FinancialExtraction;
  rawContent: string;
}

export interface EnrichExtractionResult {
  extraction: FinancialExtraction;
  appliedRules: string[];
  appliedPatterns: string[];
  appliedInstruments: string[];
  overriddenFields: string[];
  overriddenCriticalFields: string[];
  fieldSources: Record<string, EnrichmentFieldSource>;
}

interface MatchContext {
  description: string;
  rawContent: string;
  category: string;
  paymentMethod: string;
}

export class EnrichExtractionUseCase {
  constructor(
    private readonly userRuleRepository: UserRuleRepositoryPort,
    private readonly learningPatternRepository: UserLearningPatternRepositoryPort,
    private readonly instrumentLookup: InstrumentLookupPort,
    private readonly categoryRepository: CategoryConfigRepositoryPort,
  ) {}

  async execute(input: EnrichExtractionInput): Promise<EnrichExtractionResult> {
    const [rules, patterns] = await Promise.all([
      this.userRuleRepository.findActiveByUserId(input.userId),
      this.learningPatternRepository.findByUserId(input.userId),
    ]);

    let extraction = this.cloneExtraction(input.extraction);
    const appliedRules: string[] = [];
    const appliedPatterns: string[] = [];
    const appliedInstruments: string[] = [];
    const overriddenFields: string[] = [];
    const overriddenCriticalFields: string[] = [];
    const fieldSources: Record<string, EnrichmentFieldSource> = {};

    const context = this.buildMatchContext(extraction, input.rawContent);

    for (const rule of rules) {
      if (!this.matchesCondition(rule.condition, context)) {
        continue;
      }

      const applied = this.applyAction(extraction, rule.action);
      if (applied.length === 0) {
        continue;
      }

      appliedRules.push(rule.name);

      for (const field of applied) {
        this.markOverride(field, "rule", overriddenFields, overriddenCriticalFields, fieldSources);
        extraction.confidence[field] = ENRICHMENT_CONFIDENCE;
      }

      extraction = this.refreshDerivedFields(extraction, applied);
      Object.assign(context, this.buildMatchContext(extraction, input.rawContent));
    }

    const searchableText = `${context.rawContent} ${context.description}`.toLowerCase();

    for (const pattern of patterns) {
      const keyword = pattern.inputSignal.keyword.toLowerCase();
      if (!searchableText.includes(keyword)) {
        continue;
      }

      const applied = this.applyPatternOutput(extraction, pattern.outputSignal);
      if (applied.length === 0) {
        continue;
      }

      appliedPatterns.push(`${pattern.patternType}:${keyword}`);

      for (const field of applied) {
        if (fieldSources[field]) {
          continue;
        }

        this.markOverride(field, "pattern", overriddenFields, overriddenCriticalFields, fieldSources);
        extraction.confidence[field] = ENRICHMENT_CONFIDENCE;
      }

      extraction = this.refreshDerivedFields(extraction, applied);
    }

    const resolved = await this.instrumentLookup.resolve({
      userId: input.userId,
      financialInstitution: extraction.financialInstitution,
      cardLastFourDigits: extraction.cardLastFourDigits,
      cardBrand: extraction.cardBrand,
      paymentMethodType: extraction.paymentMethodType,
    });

    if (resolved.financialAccountId) {
      extraction.financialAccountId = resolved.financialAccountId;
      this.markOverride("financialAccountId", "instrument", overriddenFields, overriddenCriticalFields, fieldSources);
      extraction.confidence.financialAccountId = ENRICHMENT_CONFIDENCE;
      appliedInstruments.push(`account:${resolved.financialAccountId}`);
    }

    if (resolved.paymentMethodId) {
      extraction.paymentMethodId = resolved.paymentMethodId;
      this.markOverride("paymentMethodId", "instrument", overriddenFields, overriddenCriticalFields, fieldSources);
      extraction.confidence.paymentMethodId = ENRICHMENT_CONFIDENCE;
      appliedInstruments.push(`paymentMethod:${resolved.paymentMethodId}`);
    }

    if (resolved.cardId) {
      extraction.cardId = resolved.cardId;
      this.markOverride("cardId", "instrument", overriddenFields, overriddenCriticalFields, fieldSources);
      extraction.confidence.cardId = ENRICHMENT_CONFIDENCE;
      appliedInstruments.push(`card:${resolved.cardId}`);
    }

    const categories = await this.categoryRepository.listAllActiveByUserId(input.userId);
    const resolvedCategoryId = resolveCategoryIdFromNames(categories, {
      categoriaPrincipal: extraction.categoriaPrincipal,
      subcategoria: extraction.subcategoria,
      category: extraction.category,
    });

    if (resolvedCategoryId) {
      extraction.categoryId = resolvedCategoryId;
      extraction.category = this.buildCategoryLabel(categories, resolvedCategoryId);
      this.markOverride("categoryId", "instrument", overriddenFields, overriddenCriticalFields, fieldSources);
      extraction.confidence.categoryId = ENRICHMENT_CONFIDENCE;
      appliedInstruments.push(`category:${resolvedCategoryId}`);
    }

    return {
      extraction,
      appliedRules,
      appliedPatterns,
      appliedInstruments,
      overriddenFields,
      overriddenCriticalFields,
      fieldSources,
    };
  }

  private emptyResult(extraction: FinancialExtraction): EnrichExtractionResult {
    return {
      extraction,
      appliedRules: [],
      appliedPatterns: [],
      appliedInstruments: [],
      overriddenFields: [],
      overriddenCriticalFields: [],
      fieldSources: {},
    };
  }

  private cloneExtraction(extraction: FinancialExtraction): FinancialExtraction {
    return {
      ...extraction,
      confidence: { ...extraction.confidence },
      missingFields: [...extraction.missingFields],
    };
  }

  private buildMatchContext(
    extraction: FinancialExtraction,
    rawContent: string,
  ): MatchContext {
    return {
      description: (extraction.description ?? "").toLowerCase(),
      rawContent: rawContent.toLowerCase(),
      category: (extraction.category ?? "").toLowerCase(),
      paymentMethod: (extraction.paymentMethod ?? "").toLowerCase(),
    };
  }

  private matchesCondition(condition: RuleCondition, context: MatchContext): boolean {
    const fieldValue = context[condition.field];

    if (condition.operator === "contains") {
      return fieldValue.includes(condition.value.toLowerCase());
    }

    return fieldValue === condition.value.toLowerCase();
  }

  private applyAction(extraction: FinancialExtraction, action: RuleAction): string[] {
    const applied: string[] = [];
    const field = action.set;

    switch (field) {
      case "type":
        if (typeof action.value === "string" && isValidTransactionType(action.value)) {
          extraction.type = action.value;
          applied.push("type");
        }
        break;
      case "amount":
        if (typeof action.value === "number" && action.value > 0) {
          extraction.amount = action.value;
          applied.push("amount");
        }
        break;
      case "description":
        if (typeof action.value === "string") {
          extraction.description = action.value;
          applied.push("description");
        }
        break;
      case "category":
        if (typeof action.value === "string") {
          extraction.category = action.value;
          applied.push("category");
        }
        break;
      case "date":
        if (typeof action.value === "string") {
          extraction.date = action.value;
          applied.push("date");
        }
        break;
      case "paymentMethod":
        if (typeof action.value === "string") {
          extraction.paymentMethod = action.value;
          applied.push("paymentMethod");
        }
        break;
    }

    return applied;
  }

  private applyPatternOutput(
    extraction: FinancialExtraction,
    output: {
      category?: string;
      categoryId?: string;
      paymentMethod?: string;
      paymentMethodId?: string;
      type?: "EXPENSE" | "INCOME" | "TRANSFER";
    },
  ): string[] {
    const applied: string[] = [];

    if (output.type) {
      extraction.type = output.type;
      applied.push("type");
    }

    if (output.category) {
      extraction.category = output.category;
      applied.push("category");
    }

    if (output.paymentMethod) {
      extraction.paymentMethod = output.paymentMethod;
      applied.push("paymentMethod");
    }

    if (output.paymentMethodId) {
      extraction.paymentMethodId = output.paymentMethodId;
      applied.push("paymentMethodId");
    }

    return applied;
  }

  private refreshDerivedFields(
    extraction: FinancialExtraction,
    appliedFields: string[],
  ): FinancialExtraction {
    extraction.missingFields = extraction.missingFields.filter(
      (field) => !appliedFields.includes(field),
    );

    if (extraction.amount !== null && extraction.amount > 0) {
      extraction.missingFields = extraction.missingFields.filter((field) => field !== "amount");
    }

    if (extraction.type !== "UNKNOWN") {
      extraction.missingFields = extraction.missingFields.filter((field) => field !== "type");
    }

    if (appliedFields.some((field) => CRITICAL_FIELDS.has(field))) {
      extraction.followUpQuestion = null;
    }

    return extraction;
  }

  private markOverride(
    field: string,
    source: EnrichmentFieldSource,
    overriddenFields: string[],
    overriddenCriticalFields: string[],
    fieldSources: Record<string, EnrichmentFieldSource>,
  ): void {
    if (!overriddenFields.includes(field)) {
      overriddenFields.push(field);
    }

    if (CRITICAL_FIELDS.has(field) && !overriddenCriticalFields.includes(field)) {
      overriddenCriticalFields.push(field);
    }

    fieldSources[field] = source;
  }

  private buildCategoryLabel(
    categories: Awaited<ReturnType<CategoryConfigRepositoryPort["listAllActiveByUserId"]>>,
    categoryId: string,
  ): string {
    const category = categories.find((item) => item.id === categoryId);

    if (!category) {
      return "";
    }

    if (!category.parentCategoryId) {
      return category.name;
    }

    const parent = categories.find((item) => item.id === category.parentCategoryId);
    return parent ? `${parent.name} → ${category.name}` : category.name;
  }
}
