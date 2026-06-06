import type { BankProfile } from "../bank-statement-parser.types";

export type BankLayoutSource = "WEB" | "ANDROID" | "IOS" | "SCANNED" | "UNKNOWN";

export type BankLayoutDocumentType =
  | "EXTRATO"
  | "PIX"
  | "TED"
  | "DOC"
  | "FATURA"
  | "OUTROS";

export type BankHomologationStatus = "NAO_HOMOLOGADO" | "PARCIAL" | "HOMOLOGADO";

export type BankFixtureMeta = {
  bankId?: string;
  profile?: BankProfile;
  source?: BankLayoutSource;
  documentType?: BankLayoutDocumentType;
  passwordProtected?: boolean;
  pdfPassword?: string;
  minTransactions?: number;
  homologationStatus?: BankHomologationStatus;
  notes?: string;
};

export type BankLayoutCatalogEntry = {
  bank: string;
  bankId: string;
  profile: BankProfile;
  channel: BankLayoutSource;
  documentType: BankLayoutDocumentType;
  passwordProtected: boolean;
  requiresOcr: boolean;
  status: BankHomologationStatus;
  successRate: number | null;
  fixtureCount: number;
  notes: string;
};
