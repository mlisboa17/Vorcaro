export type HomologCheckStatus = "PASS" | "FAIL" | "SKIP" | "WARN";

export type HomologCheck = {
  name: string;
  status: HomologCheckStatus;
  detail: string;
};

export type HomologImportMetrics = {
  total: number;
  recognized: number;
  needsReview: number;
  ignored: number;
  errors: number;
};

export type HomologScenarioResult = {
  id: string;
  title: string;
  status: "PASS" | "FAIL";
  bank: string;
  file: string;
  similarity: number;
  similarityTier: string;
  metrics: HomologImportMetrics;
  modelAction: "created" | "reused" | "approximate" | "forked" | "none";
  modelId: string | null;
  modelVersion: number | null;
  layoutLabel: string | null;
  correctionsApplied: number;
  problems: string[];
  checks: HomologCheck[];
};

export type StatementLayoutTrainingHomologReport = {
  generatedAt: string;
  userId: string;
  fixturesRoot: string;
  scenarios: HomologScenarioResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    ready: boolean;
  };
  uiValidation: HomologCheck[];
  importFlowValidation: HomologCheck[];
};

export type HomologRunOptions = {
  userId?: string;
  fixturesRoot?: string;
  cleanup?: boolean;
};
