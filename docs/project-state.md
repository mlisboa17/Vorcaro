# Estado do Projeto — Vorcaro Finance Control

Documento de inventário técnico. Última revisão: 2026-06-03 (Sprint 8).

**Princípios transversais**

- **Multitenancy:** `userId` nunca vem do frontend; sempre `session.user.id` (Auth.js).
- **Monetário:** valores persistidos com `Decimal` no Prisma (nunca `float`/`number` no banco).
- **Determinismo:** motores de cálculo e IA usam apenas dados locais (`logos_financeiro`).

---

## Módulos concluídos (até Sprint 6)

### Caixa Financeira (Inbox)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Capturar lançamentos brutos (texto, voz, imagem, importação) antes da confirmação em transação. |
| **Rotas UI** | `/dashboard/inbox` |
| **Rotas API** | `GET/POST /api/inbox`, `GET /api/inbox/[id]`, `POST /api/inbox/[id]/confirm`, `POST /api/inbox/bulk-update` |
| **Tabelas Prisma** | `FinancialInbox`, `Attachment`, `ExtractionResult` |
| **Serviços principais** | `IngestInboxItemUseCase`, `ProcessInboxItemUseCase`, `ConfirmAndCreateTransactionUseCase`, `ListInboxItemsUseCase`, `BatchUpdateInboxItemsUseCase`, `GeminiAiService` (extração legada) |
| **Status** | Concluído |

### Inbox (processamento e fila)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Pipeline assíncrono (BullMQ) para NLP/OCR e enriquecimento de itens da caixa. |
| **Rotas** | Worker: `npm run worker:inbox` |
| **Tabelas** | Mesmas do Inbox + Redis para filas |
| **Serviços** | `EnrichExtractionUseCase`, repositórios Prisma em `financial-inbox/infrastructure` |
| **Status** | Concluído |

### Importação de Extratos

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Importar OFX/CSV/PDF com preview e confirmação em lote. |
| **Rotas UI** | Modal no dashboard executivo e inbox |
| **Rotas API** | `POST /api/inbox/import`, `POST /api/inbox/import/preview`, `POST /api/inbox/import/confirm` |
| **Tabelas** | `FinancialInbox` (`channel` = `WEB_IMPORT`, `importHash`) |
| **Serviços** | `src/lib/inbox/financial-file-import.ts`, `financial-import-pipeline.ts` |
| **Status** | Concluído |

### Cartões

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Cadastro de cartões, fatura e vínculo com contas. |
| **Rotas UI** | `/dashboard/settings` (aba cartões), `/dashboard/instruments` |
| **Rotas API** | `GET/POST /api/config/cartoes`, `PATCH/DELETE /api/config/cartoes/[id]`; legado `GET/POST/PUT /api/cards` |
| **Tabelas** | `Card` |
| **Serviços** | `FinancialInstrumentUseCase`, `CreditCardTransactionBuilderService`, `ResolveCardBillingService` |
| **Status** | Concluído |

### Recorrências

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Lançamentos periódicos com alocações padrão e geração de transações. |
| **Rotas UI** | `/dashboard/recurring` |
| **Rotas API** | `GET/POST /api/config/lancamentos-recorrentes`, `PATCH/DELETE /api/config/lancamentos-recorrentes/[id]`, `POST /api/transactions/recurring/process` |
| **Tabelas** | `LancamentoRecorrente` |
| **Serviços** | `RecurringTransactionUseCases`, `ProcessRecurringTransactionsUseCase` |
| **Status** | Concluído |

### Patrimônio (Ativos)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Registrar ativos, valorização e movimentações patrimoniais. |
| **Rotas UI** | `/dashboard/patrimony` |
| **Rotas API** | `GET/POST /api/patrimony/assets`, `PATCH/DELETE /api/patrimony/assets/[id]`, `POST /api/patrimony/transactions/valuation`, `POST /api/patrimony/transactions/investment`, `GET /api/patrimony/summary` |
| **Tabelas** | `PatrimonyAsset`, `PatrimonyTransaction` |
| **Serviços** | `PatrimonyUseCases`, `PatrimonyAccountingService`, `PrismaPatrimonyUnitOfWork` |
| **Status** | Concluído |

### Passivos

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Dívidas/financiamentos com saldo, juros e amortização. |
| **Rotas UI** | `/dashboard/patrimony` (aba passivos) |
| **Rotas API** | `GET/POST /api/patrimony/liabilities`, `PATCH/DELETE /api/patrimony/liabilities/[id]`, `POST /api/patrimony/transactions/financing-payment` |
| **Tabelas** | `PatrimonyLiability` |
| **Serviços** | `LiabilityAmortizationService`, use cases de patrimônio |
| **Status** | Concluído |

### Consórcios

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Gestão de grupos, parcelas, contemplação e vínculo com ativo. |
| **Rotas UI** | `/dashboard/consorcios` |
| **Rotas API** | `GET/POST /api/consortiums`, `PATCH/DELETE /api/consortiums/[id]`, `POST /api/patrimony/transactions/consortium-parcel`, `POST /api/patrimony/transactions/consortium-contemplation` |
| **Tabelas** | `Consortium` |
| **Serviços** | `ConsortiumService` |
| **Status** | Concluído |

### Fluxo de Caixa Futuro

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Projeção determinística de saldo (7–365 dias) com recorrências, faturas e compromissos. |
| **Rotas UI** | `/dashboard/cashflow` |
| **Rotas API** | `GET /api/cashflow/projection` |
| **Tabelas** | Leitura: `Transaction`, `LancamentoRecorrente`, `Card`, `Consortium`, `PatrimonyLiability`, contas |
| **Serviços** | `CashflowProjectionService` (`buildCashflowProjectionService`) |
| **Status** | Concluído |

### Dashboard Executivo

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Visão consolidada: caixa, mês, orçamento, patrimônio, consórcios e alertas. |
| **Rotas UI** | `/dashboard` |
| **Rotas API** | `GET /api/executive-dashboard` |
| **Tabelas** | Agregação sobre múltiplos modelos (sem tabela própria) |
| **Serviços** | `ExecutiveDashboardService`, `MonthFinancialOverviewService`, `BudgetOverviewService` (port) |
| **Status** | Concluído |

### Telegram

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Vincular chat Telegram ao usuário e ingerir mensagens na Caixa Financeira. |
| **Rotas UI** | `/dashboard/settings/integrations` |
| **Rotas API** | `POST /api/telegram/webhook`, `GET/POST/DELETE /api/telegram/integration`, legado `POST /api/webhooks/telegram` |
| **Tabelas** | `TelegramConnection`, `TelegramConnectCode` |
| **Serviços** | `ProcessTelegramUpdateService`, geração de código `/connect` |
| **Status** | Concluído (Sprint 4.7) |

### IA Financeira

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Perguntas em linguagem natural e insights com contexto agregado do banco (sem inventar dados). |
| **Rotas UI** | `/dashboard/advisor` |
| **Rotas API** | `POST /api/advisor/ask`, `GET /api/advisor/insights` |
| **Tabelas** | Leitura transversal (sem modelo dedicado) |
| **Serviços** | `AiRouterService`, `FinancialAdvisorService`, `FinancialDataAggregatorService`, `FinancialInsightsService` |
| **Status** | Concluído (Sprint 5) |

### Planejamento Financeiro Inteligente (Sprint 6)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Metas orientadas a objetivos com estratégia, viabilidade de caixa e recomendações explicáveis. |
| **Rotas UI** | `/dashboard/planning` |
| **Rotas API** | `GET/POST /api/planning/goals`, `PATCH/DELETE /api/planning/goals/[id]` |
| **Tabelas** | `FinancialGoal` |
| **Serviços** | `FinancialGoalStrategyService`, `FinancialGoalViabilityService`, `FinancialGoalPrioritizationService`, `FinancialGoalRecommendationService`, `FinancialGoalProjectionService`, `FinancialPlanningService` |
| **Advisor** | Metas injetadas em `FinancialDataAggregatorService` |
| **Dashboard** | Bloco `planning` no executivo (`ExecutivePlanningCard`) |
| **Status** | **Concluído (Sprint 6)** |

### Central de Parcelamentos (Sprint 7 — Fase 1 Read Model)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Visão unificada de parcelamentos derivada do extrato (somente leitura) |
| **Rotas UI** | `/dashboard/installments` |
| **Rotas API** | `GET /api/installments`, `GET /api/installments/[groupId]` |
| **Fonte de dados** | `Transaction.installmentGroup` / `idGrupoParcelamento` — **sem migration** |
| **Serviços** | `InstallmentReadModelService` (`getSummary`, `getFutureCommitments`, `listGroups`) |
| **Factory** | `buildInstallmentReadModelService()` em `src/lib/api/installments.ts` |
| **Regra pagamento** | Parcela paga se `dataCaixa` → `dataVencimentoFatura` → `date` ≤ hoje (UTC) |
| **Integrações (Fase 2)** | Advisor, Insights, Cashflow (`INSTALLMENT`), dashboard executivo, drill-down UI |
| **Status** | **Fase 2 concluída** (read model + integrações; sem migration) |

### Contas a Receber (Sprint 7.5)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Registrar direitos a receber (compras para terceiros / reembolsos) como ativo; cobrança parcial ou total com lançamento de receita. |
| **Rotas UI** | `/dashboard/receivables` |
| **Rotas API** | `GET/POST /api/receivables`, `POST /api/receivables/from-transaction`, `POST /api/receivables/[id]?action=collect\|cancel` |
| **Tabelas Prisma** | `Receivable` (`ReceivableStatus`) |
| **Serviços** | `ReceivableService`, `CreateReceivableUseCase`, `CollectReceivableUseCase`, `CreateReceivableFromTransactionUseCase`, `PrismaReceivableRepository` |
| **Factory** | `buildReceivableUseCases()` em `src/lib/api/receivable-use-cases.ts` |
| **Transações** | Metadata `thirdPartyPurchase` / `receivableId`; exclusão da visão de despesa pessoal em listagens e DRE |
| **Integrações** | Patrimônio (`contasAReceber`, ativo `RECEIVABLE`), cashflow (`origem: RECEIVABLE`), advisor (`contas_a_receber`), inbox (hint reembolso), Telegram (`detectReceivableTelegramHint`) |
| **Status** | **Concluído (Sprint 7.5)** |

### Central de Compromissos Recorrentes (Sprint 8)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Consolidar compromissos mensais (saídas, entradas, vencimentos) a partir de múltiplas fontes sem duplicar o cashflow. |
| **Rotas UI** | `/dashboard/commitments` |
| **Rotas API** | `GET /api/commitments/monthly?month=YYYY-MM` |
| **Tabelas Prisma** | Nenhuma (read model/DTO) |
| **Serviços** | `MonthlyCommitmentsService`, `commitment-projection.helpers` |
| **Factory** | `buildMonthlyCommitmentsUseCases()` em `src/lib/api/monthly-commitments.ts` |
| **Fontes** | Recorrências, parcelamentos, passivos, consórcios, faturas (CREDIT_CARD), recebíveis, transações agendadas |
| **Integrações** | Dashboard executivo (`ExecutiveCommitmentsCard`), Advisor (`compromissos_recorrentes`) |
| **Deduplicação** | Chave `(descrição normalizada + data + valor)` — documentada no serviço |
| **Status** | **Concluído (Sprint 8)** |

### Inbox Intelligence (evolução pós-7.4)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Classificação assistida, duplicatas, reembolsos, confirmação em lote e sugestões em massa. |
| **Rotas API** | `POST /api/inbox/bulk-confirm`, `POST /api/inbox/bulk-apply-suggestions`, `GET /api/inbox/intelligence/*` |
| **Serviços** | `InboxClassificationService`, `detectPotentialReimbursement`, handlers bulk em `src/lib/inbox/` |
| **Status** | Concluído (integrado à Caixa Financeira) |

---

## Módulos de suporte (transversais)

| Módulo | Objetivo | Status |
|--------|----------|--------|
| **Extrato & Lançamentos** | CRUD, estorno, bulk | Concluído |
| **Cadastros (config)** | Contas, categorias, formas de pagamento | Concluído |
| **Cérebro & Automações** | Regras e padrões de aprendizado | Em evolução |
| **Orçamento (budget)** | Overview no dashboard executivo | Concluído (via port) |

Detalhes de APIs: `docs/api-inventory.md`.  
Detalhes de schema: `docs/database-inventory.md`.  
Preparação Sprint 6: `docs/sprint-6-preparation.md`.  
Preparação Sprint 7: `docs/sprint-7-impact-analysis.md`, `docs/installments-readiness.md`.

---

## Migrations ativas

| Migration | Conteúdo |
|-----------|----------|
| `20260602152611_init_clean_schema` | Schema rebaseline |
| `20260602163707_telegram_connections` | Telegram |
| `20260602190420_financial_goals` | Planejamento (Sprint 6) |
| `20260603010000_receivables_sprint75` | Contas a Receber (Sprint 7.5) |

Legado arquivado: `prisma/migrations_archived_legacy/`, inventário em `docs/migrations-legacy-inventory.md`.

---

## Validação recomendada

```bash
npx prisma validate
npx prisma generate
npx tsc --noEmit
npm test -- --run
```
