-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CHECKING', 'SAVINGS', 'CREDIT_CARD', 'CASH', 'INVESTMENT', 'OTHER', 'CORRENTE', 'CONTA_CORRENTE', 'POUPANCA', 'INVESTIMENTO', 'CARTEIRA_DIGITAL', 'CARTEIRA_DINHEIRO', 'INTERNACIONAL', 'PJ');

-- CreateEnum
CREATE TYPE "CardBrand" AS ENUM ('VISA', 'MASTERCARD', 'ELO', 'AMEX', 'HIPERCARD', 'OTHER');

-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('CREDITO', 'DEBITO', 'MULTIPLO');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('RECEITA', 'DESPESA');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'BANK_TRANSFER', 'BOLETO', 'OTHER', 'DINHEIRO', 'CARTAO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'TRANSFERENCIA', 'TRANSFERENCIA_BANCARIA', 'CARTEIRA_DIGITAL', 'DEBITO_AUTOMATICO');

-- CreateEnum
CREATE TYPE "FrequenciaRecorrencia" AS ENUM ('SEMANAL', 'QUINZENAL', 'MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "TipoLancamentoRecorrente" AS ENUM ('RECEITA', 'DESPESA');

-- CreateEnum
CREATE TYPE "InboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'NEEDS_CONFIRMATION', 'SAVED', 'ERROR');

-- CreateEnum
CREATE TYPE "InboxChannel" AS ENUM ('WEB', 'WEB_VOICE', 'WEB_IMAGE', 'WEB_IMPORT', 'TELEGRAM', 'TELEGRAM_VOICE', 'TELEGRAM_IMAGE', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('CONSORCIO', 'INVESTIMENTO', 'BEM', 'DIREITO_RECEBER', 'ADIANTAMENTO', 'VEHICLE', 'REAL_ESTATE', 'INVESTMENT', 'CONSORTIUM', 'RECEIVABLE', 'OTHER');

-- CreateEnum
CREATE TYPE "LiabilityType" AS ENUM ('EMPRESTIMO', 'FINANCIAMENTO', 'OBRIGACAO', 'FINANCING', 'LOAN', 'CREDIT_LINE', 'OTHER');

-- CreateEnum
CREATE TYPE "PatrimonyTxType" AS ENUM ('APORTE', 'RESGATE', 'AMORTIZACAO', 'JUROS', 'SEGURO', 'TAXA', 'CORRECAO', 'RENDIMENTO', 'DEPRECIACAO');

-- CreateEnum
CREATE TYPE "ConsortiumType" AS ENUM ('VEHICLE', 'REAL_ESTATE', 'SERVICE', 'OTHER');

-- CreateEnum
CREATE TYPE "ConsortiumStatus" AS ENUM ('NOT_CONTEMPLATED', 'CONTEMPLATED', 'ASSET_ACQUIRED', 'COMPLETED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "FinancialAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "institutionName" TEXT,
    "type" "AccountType" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "financialAccountId" TEXT,
    "name" TEXT NOT NULL,
    "institutionName" TEXT,
    "brand" "CardBrand" NOT NULL,
    "type" "CardType" NOT NULL,
    "lastFourDigits" TEXT,
    "creditLimit" DECIMAL(15,2),
    "closingDay" INTEGER,
    "dueDay" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "parentCategoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PaymentMethodType" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "categoryId" TEXT,
    "paymentMethodId" TEXT,
    "cardId" TEXT,
    "inboxItemId" TEXT,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dataCompra" TIMESTAMP(3),
    "dataCaixa" TIMESTAMP(3),
    "dataVencimentoFatura" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "installments" INTEGER NOT NULL DEFAULT 1,
    "installmentGroup" TEXT,
    "currentInstallment" INTEGER,
    "totalInstallments" INTEGER,
    "numeroParcela" INTEGER,
    "totalParcelas" INTEGER,
    "idGrupoParcelamento" TEXT,
    "observacoesInternas" TEXT,
    "lancamentoRecorrenteId" TEXT,
    "dataRecorrencia" TIMESTAMP(3),
    "liabilityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LancamentoRecorrente" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" "TipoLancamentoRecorrente" NOT NULL,
    "valor" DECIMAL(15,2) NOT NULL,
    "frequencia" "FrequenciaRecorrencia" NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),
    "proximaExecucao" TIMESTAMP(3) NOT NULL,
    "estaAtivo" BOOLEAN NOT NULL DEFAULT true,
    "categoryId" TEXT NOT NULL,
    "financialAccountId" TEXT NOT NULL,
    "paymentMethodId" TEXT NOT NULL,
    "cardId" TEXT,
    "observacoes" TEXT,
    "liabilityId" TEXT,
    "defaultAllocations" JSONB,
    "diaInicioOriginal" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LancamentoRecorrente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialInbox" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "InboxStatus" NOT NULL DEFAULT 'PENDING',
    "channel" "InboxChannel" NOT NULL,
    "rawContent" TEXT NOT NULL,
    "channelMeta" JSONB,
    "metadata" JSONB,
    "externalId" TEXT,
    "importHash" TEXT,
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialInbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "inboxItemId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractionResult" (
    "id" TEXT NOT NULL,
    "inboxItemId" TEXT NOT NULL,
    "attachmentId" TEXT,
    "provider" TEXT NOT NULL,
    "extractedData" JSONB NOT NULL,
    "confidence" JSONB NOT NULL,
    "tokensUsed" INTEGER,
    "processingMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractionResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "condition" JSONB NOT NULL,
    "action" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLearningPattern" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "patternType" TEXT NOT NULL,
    "inputSignal" JSONB NOT NULL,
    "outputSignal" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLearningPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatrimonyAsset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" "AssetType" NOT NULL,
    "valorAquisicao" DECIMAL(15,2) NOT NULL,
    "valorAtual" DECIMAL(15,2) NOT NULL,
    "dataAquisicao" TIMESTAMP(3),
    "estaAtivo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "liabilityId" TEXT,

    CONSTRAINT "PatrimonyAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consortium" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "ConsortiumType" NOT NULL,
    "status" "ConsortiumStatus" NOT NULL,
    "valorCredito" DECIMAL(15,2) NOT NULL,
    "valorLance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "valorPago" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "valorTaxas" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "quantidadeParcelas" INTEGER NOT NULL,
    "parcelasPagas" INTEGER NOT NULL DEFAULT 0,
    "dataContratacao" TIMESTAMP(3),
    "dataContemplacao" TIMESTAMP(3),
    "dataQuitacao" TIMESTAMP(3),
    "assetId" TEXT,
    "lancamentoRecorrenteId" TEXT,
    "estaAtivo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consortium_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatrimonyLiability" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" "LiabilityType" NOT NULL,
    "saldoOriginal" DECIMAL(15,2) NOT NULL,
    "saldoAtual" DECIMAL(15,2) NOT NULL,
    "taxaJuros" DECIMAL(8,4),
    "dataContratacao" TIMESTAMP(3),
    "dataQuitacaoPrevista" TIMESTAMP(3),
    "estaAtivo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatrimonyLiability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatrimonyTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT,
    "liabilityId" TEXT,
    "tipo" "PatrimonyTxType" NOT NULL,
    "valorTotal" DECIMAL(15,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT,
    "mainTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatrimonyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE INDEX "FinancialAccount_userId_idx" ON "FinancialAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialAccount_userId_name_key" ON "FinancialAccount"("userId", "name");

-- CreateIndex
CREATE INDEX "Card_userId_idx" ON "Card"("userId");

-- CreateIndex
CREATE INDEX "Card_financialAccountId_idx" ON "Card"("financialAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Card_userId_name_key" ON "Card"("userId", "name");

-- CreateIndex
CREATE INDEX "Category_userId_idx" ON "Category"("userId");

-- CreateIndex
CREATE INDEX "Category_userId_isActive_idx" ON "Category"("userId", "isActive");

-- CreateIndex
CREATE INDEX "Category_parentCategoryId_idx" ON "Category"("parentCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_userId_name_parentCategoryId_key" ON "Category"("userId", "name", "parentCategoryId");

-- CreateIndex
CREATE INDEX "PaymentMethod_userId_idx" ON "PaymentMethod"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_userId_name_key" ON "PaymentMethod"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_inboxItemId_key" ON "Transaction"("inboxItemId");

-- CreateIndex
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");

-- CreateIndex
CREATE INDEX "Transaction_accountId_idx" ON "Transaction"("accountId");

-- CreateIndex
CREATE INDEX "Transaction_cardId_idx" ON "Transaction"("cardId");

-- CreateIndex
CREATE INDEX "Transaction_installmentGroup_idx" ON "Transaction"("installmentGroup");

-- CreateIndex
CREATE INDEX "Transaction_lancamentoRecorrenteId_dataRecorrencia_idx" ON "Transaction"("lancamentoRecorrenteId", "dataRecorrencia");

-- CreateIndex
CREATE INDEX "Transaction_liabilityId_idx" ON "Transaction"("liabilityId");

-- CreateIndex
CREATE INDEX "LancamentoRecorrente_userId_estaAtivo_proximaExecucao_idx" ON "LancamentoRecorrente"("userId", "estaAtivo", "proximaExecucao");

-- CreateIndex
CREATE INDEX "LancamentoRecorrente_userId_idx" ON "LancamentoRecorrente"("userId");

-- CreateIndex
CREATE INDEX "LancamentoRecorrente_liabilityId_idx" ON "LancamentoRecorrente"("liabilityId");

-- CreateIndex
CREATE INDEX "FinancialInbox_userId_status_idx" ON "FinancialInbox"("userId", "status");

-- CreateIndex
CREATE INDEX "FinancialInbox_status_createdAt_idx" ON "FinancialInbox"("status", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialInbox_userId_channel_externalId_idx" ON "FinancialInbox"("userId", "channel", "externalId");

-- CreateIndex
CREATE INDEX "FinancialInbox_userId_channel_importHash_idx" ON "FinancialInbox"("userId", "channel", "importHash");

-- CreateIndex
CREATE INDEX "Attachment_inboxItemId_idx" ON "Attachment"("inboxItemId");

-- CreateIndex
CREATE INDEX "ExtractionResult_inboxItemId_idx" ON "ExtractionResult"("inboxItemId");

-- CreateIndex
CREATE INDEX "UserRule_userId_isActive_idx" ON "UserRule"("userId", "isActive");

-- CreateIndex
CREATE INDEX "UserLearningPattern_userId_patternType_idx" ON "UserLearningPattern"("userId", "patternType");

-- CreateIndex
CREATE INDEX "PatrimonyAsset_userId_estaAtivo_idx" ON "PatrimonyAsset"("userId", "estaAtivo");

-- CreateIndex
CREATE INDEX "PatrimonyAsset_userId_tipo_idx" ON "PatrimonyAsset"("userId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "Consortium_assetId_key" ON "Consortium"("assetId");

-- CreateIndex
CREATE INDEX "Consortium_userId_idx" ON "Consortium"("userId");

-- CreateIndex
CREATE INDEX "Consortium_userId_estaAtivo_idx" ON "Consortium"("userId", "estaAtivo");

-- CreateIndex
CREATE INDEX "Consortium_userId_status_idx" ON "Consortium"("userId", "status");

-- CreateIndex
CREATE INDEX "PatrimonyLiability_userId_estaAtivo_idx" ON "PatrimonyLiability"("userId", "estaAtivo");

-- CreateIndex
CREATE INDEX "PatrimonyLiability_userId_tipo_idx" ON "PatrimonyLiability"("userId", "tipo");

-- CreateIndex
CREATE INDEX "PatrimonyTransaction_userId_data_idx" ON "PatrimonyTransaction"("userId", "data");

-- CreateIndex
CREATE INDEX "PatrimonyTransaction_assetId_idx" ON "PatrimonyTransaction"("assetId");

-- CreateIndex
CREATE INDEX "PatrimonyTransaction_liabilityId_idx" ON "PatrimonyTransaction"("liabilityId");

-- CreateIndex
CREATE INDEX "PatrimonyTransaction_mainTransactionId_idx" ON "PatrimonyTransaction"("mainTransactionId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentCategoryId_fkey" FOREIGN KEY ("parentCategoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_liabilityId_fkey" FOREIGN KEY ("liabilityId") REFERENCES "PatrimonyLiability"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_inboxItemId_fkey" FOREIGN KEY ("inboxItemId") REFERENCES "FinancialInbox"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_lancamentoRecorrenteId_fkey" FOREIGN KEY ("lancamentoRecorrenteId") REFERENCES "LancamentoRecorrente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoRecorrente" ADD CONSTRAINT "LancamentoRecorrente_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoRecorrente" ADD CONSTRAINT "LancamentoRecorrente_liabilityId_fkey" FOREIGN KEY ("liabilityId") REFERENCES "PatrimonyLiability"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoRecorrente" ADD CONSTRAINT "LancamentoRecorrente_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoRecorrente" ADD CONSTRAINT "LancamentoRecorrente_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoRecorrente" ADD CONSTRAINT "LancamentoRecorrente_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoRecorrente" ADD CONSTRAINT "LancamentoRecorrente_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialInbox" ADD CONSTRAINT "FinancialInbox_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_inboxItemId_fkey" FOREIGN KEY ("inboxItemId") REFERENCES "FinancialInbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractionResult" ADD CONSTRAINT "ExtractionResult_inboxItemId_fkey" FOREIGN KEY ("inboxItemId") REFERENCES "FinancialInbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractionResult" ADD CONSTRAINT "ExtractionResult_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Attachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRule" ADD CONSTRAINT "UserRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLearningPattern" ADD CONSTRAINT "UserLearningPattern_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatrimonyAsset" ADD CONSTRAINT "PatrimonyAsset_liabilityId_fkey" FOREIGN KEY ("liabilityId") REFERENCES "PatrimonyLiability"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatrimonyAsset" ADD CONSTRAINT "PatrimonyAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consortium" ADD CONSTRAINT "Consortium_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consortium" ADD CONSTRAINT "Consortium_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "PatrimonyAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consortium" ADD CONSTRAINT "Consortium_lancamentoRecorrenteId_fkey" FOREIGN KEY ("lancamentoRecorrenteId") REFERENCES "LancamentoRecorrente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatrimonyLiability" ADD CONSTRAINT "PatrimonyLiability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatrimonyTransaction" ADD CONSTRAINT "PatrimonyTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatrimonyTransaction" ADD CONSTRAINT "PatrimonyTransaction_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "PatrimonyAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatrimonyTransaction" ADD CONSTRAINT "PatrimonyTransaction_liabilityId_fkey" FOREIGN KEY ("liabilityId") REFERENCES "PatrimonyLiability"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatrimonyTransaction" ADD CONSTRAINT "PatrimonyTransaction_mainTransactionId_fkey" FOREIGN KEY ("mainTransactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
