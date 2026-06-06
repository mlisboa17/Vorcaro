export type RealBankFormatSlot =
  | "PDF_CURTO"
  | "PDF_LONGO"
  | "OFX"
  | "CSV"
  | "XLS"
  | "XLSX";

export type RealBankHomologResultStatus = "PASSED" | "WARNING" | "FAILED" | "SKIPPED" | "PENDING";

export type RealBankFormatSlotConfig = {
  slot: RealBankFormatSlot;
  label: string;
  fileNames: string[];
  format: "PDF" | "OFX" | "CSV" | "XLS" | "XLSX";
};

export const REAL_BANK_FORMAT_SLOTS: RealBankFormatSlotConfig[] = [
  { slot: "PDF_CURTO", label: "PDF curto", fileNames: ["pdf-curto.pdf"], format: "PDF" },
  { slot: "PDF_LONGO", label: "PDF longo", fileNames: ["pdf-longo.pdf"], format: "PDF" },
  { slot: "OFX", label: "OFX", fileNames: ["extrato.ofx", "extrato.OFX"], format: "OFX" },
  { slot: "CSV", label: "CSV", fileNames: ["extrato.csv"], format: "CSV" },
  { slot: "XLS", label: "XLS", fileNames: ["extrato.xls"], format: "XLS" },
  { slot: "XLSX", label: "XLSX", fileNames: ["extrato.xlsx"], format: "XLSX" },
];

export const MINIMUM_REAL_BANKS = [
  "Bradesco_PJ",
  "Santander_PJ",
  "Itau_PJ",
  "BancoBrasil_PJ",
  "Caixa_PJ",
] as const;

export type RealBankFileMetrics = {
  total: number;
  recognized: number;
  needsReview: number;
  ignored: number;
  errors: number;
  recognitionRate: number;
  rawContentPreserved: boolean;
  silentDrops: number;
};

export type RealBankFileResult = {
  bankFolder: string;
  bankLabel: string;
  formatSlot: RealBankFormatSlot;
  formatLabel: string;
  fileName: string | null;
  availability: "available" | "not_available";
  status: RealBankHomologResultStatus;
  metrics: RealBankFileMetrics | null;
  similarity: number | null;
  similarityTier: string | null;
  modelId: string | null;
  modelLabel: string | null;
  modelVersion: number | null;
  modelAction: "created" | "reused" | "approximate" | "none";
  problems: string[];
  correctionsApplied: string[];
  parserError: string | null;
};

export type RealBankHomologReport = {
  generatedAt: string;
  userId: string | null;
  banksRoot: string;
  results: RealBankFileResult[];
  minimumBanks: {
    bankFolder: string;
    status: RealBankHomologResultStatus;
    detail: string;
  }[];
  summary: {
    totalSlots: number;
    available: number;
    notAvailable: number;
    passed: number;
    warning: number;
    failed: number;
    skipped: number;
    pending: number;
    readyForMerge: boolean;
  };
};
