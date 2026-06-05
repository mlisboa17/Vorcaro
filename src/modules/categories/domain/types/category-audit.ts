export const CATEGORY_AUDIT_FINDING_TYPES = [
  "DUPLICATE_CATEGORY",
  "DUPLICATE_SUBCATEGORY",
  "SUPPLIER_AS_CATEGORY",
  "OVERLAPPING_CATEGORY",
  "INCONSISTENT_NAMING",
  "LOW_USAGE_CATEGORY",
  "MERGE_SUGGESTION",
] as const;

export type CategoryAuditFindingType = (typeof CATEGORY_AUDIT_FINDING_TYPES)[number];

export type CategoryAuditSeverity = "LOW" | "MEDIUM" | "HIGH";

export type CategoryAuditFinding = {
  type: CategoryAuditFindingType;
  severity: CategoryAuditSeverity;
  title: string;
  description: string;
  currentItems: string[];
  suggestedAction: string;
  suggestedTarget?: string;
  confidence: number;
};

export type CategoryAuditMergeSuggestion = {
  sources: string[];
  target: string;
  confidence: number;
};

export type CategoryAuditSummary = {
  totalFindings: number;
  high: number;
  medium: number;
  low: number;
};

export type TaxonomyHealthScore = {
  score: number;
  label: "Excelente" | "Boa" | "Regular" | "Precisa atenção";
};

export type CategoryAuditImprovement = {
  id: string;
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  impactLabel: string;
  items: string[];
  findingType: CategoryAuditFindingType;
};

export type CategoryAuditReport = {
  findings: CategoryAuditFinding[];
  summary: CategoryAuditSummary;
  suggestedMerges: CategoryAuditMergeSuggestion[];
  supplierLikeCategories: string[];
  lowUsageCategories: string[];
  healthScore: TaxonomyHealthScore;
  topImprovements: CategoryAuditImprovement[];
};
