-- Sprint 15.0.2 — revisão segura e PDF protegido

ALTER TYPE "FinancialDocumentStatus" ADD VALUE 'PASSWORD_REQUIRED';

CREATE TYPE "FinancialDocumentAuditAction" AS ENUM ('EDITED', 'APPROVED', 'REJECTED');

CREATE TABLE "FinancialDocumentAuditEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "suggestionId" TEXT,
    "action" "FinancialDocumentAuditAction" NOT NULL,
    "changedFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialDocumentAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinancialDocumentAuditEvent_userId_documentId_idx" ON "FinancialDocumentAuditEvent"("userId", "documentId");
CREATE INDEX "FinancialDocumentAuditEvent_suggestionId_idx" ON "FinancialDocumentAuditEvent"("suggestionId");

ALTER TABLE "FinancialDocumentAuditEvent" ADD CONSTRAINT "FinancialDocumentAuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialDocumentAuditEvent" ADD CONSTRAINT "FinancialDocumentAuditEvent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "FinancialDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
