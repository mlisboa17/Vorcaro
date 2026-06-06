import type { BankProfile } from "../bank-statement-parser.types";

import type {

  BankHomologationStatus,

  BankLayoutDocumentType,

  BankLayoutSource,

} from "./bank-layout.types";



export type BankHomologationRow = {

  bankId: string;

  bankName: string;

  profile: BankProfile;

  fileName: string;

  success: boolean;

  detectedBank: string;

  detectedProfile: BankProfile;

  transactionCount: number;

  confidence: number;

  requiresOcr: boolean;

  notes: string[];

  source: BankLayoutSource;

  documentType: BankLayoutDocumentType;

  passwordProtected: boolean;

  passwordRequired: boolean;

  passwordError: boolean;

  extractionMs: number;

  usedPdfParser: boolean;

  homologationStatus: BankHomologationStatus;

};



export type BankHomologationReport = {

  generatedAt: string;

  fixturesRoot: string;

  totalFixtures: number;

  successCount: number;

  successRate: number;

  realPdfCount: number;

  rows: BankHomologationRow[];

  byBankProfile: Array<{

    bankId: string;

    profile: BankProfile;

    pdfs: number;

    success: number;

    rate: number;

  }>;

  failures: Array<{

    bankId: string;

    profile: BankProfile;

    fileName: string;

    notes: string[];

  }>;

  gateCriteria: {

    minRealPdfs: number;

    minSuccessRate: number;

    realPdfCountMet: boolean;

    successRateMet: boolean;

    readyForSprint153: boolean;

  };

};



export type HomologationFixtureExpectation = {

  bankId: string;

  profile: BankProfile;

  minTransactions?: number;

  requiresOcr?: boolean;

};



export type OcrBenchmarkRow = {

  fileName: string;

  scenario: "NATIVE_PDF" | "SCANNED" | "PIX_PRINT" | "PHOTO_RECEIPT";

  extractionMs: number;

  textLength: number;

  requiresOcr: boolean;

  ocrFallbackUsed: boolean;

  confidence: number | null;

  notes: string[];

};



export type OcrBenchmarkReport = {

  generatedAt: string;

  rows: OcrBenchmarkRow[];

};



export type RealPdfHomologationGate = {

  minRealPdfs?: number;

  minSuccessRate?: number;

};


