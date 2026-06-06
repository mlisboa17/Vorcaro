# Estado do Projeto — Vorcaro Finance Control

Documento de inventário técnico. Última revisão: 2026-06-12 (Sprint 15.1.2).

## Sprint 15.1.2 — Extratos e parcelamentos

| Item | Detalhe |
|------|---------|
| **Parser extrato** | `bradesco-bank-statement-parser.ts` — débito/crédito multi-linha |
| **Parcelas fatura** | `ExtractedInstallmentPurchase` + projeção de compromissos futuros |
| **UI** | Tabela de revisão + checkbox parcelas futuras em `/dashboard/import/review` |
| **API** | `GET/POST /api/import/documents/:id/lines` |
| **Docs** | `docs/sprint-15.1.2-bank-statement-and-card-installments.md` |

## Sprint 15.1.1 — Partes do documento e reprocessamento

| Item | Detalhe |
|------|---------|
| **Metadados** | `FinancialPartiesMetadata` em `extractedJson.parties` e `metadata.parties` |
| **UI** | Review/history com pagador/recebedor; ações de reprocessamento por status |
| **API** | `POST .../reprocess`, `.../reopen`, `.../archive` |
| **Auditoria** | `REPROCESS_*`, `REOPENED_AFTER_REJECTION`, `PASSWORD_SUBMITTED` |
| **Docs** | `docs/sprint-15.1.1-document-review-reprocessing.md`, `docs/sprint-15.1.1-document-parties-metadata.md` |

## Sprint 15.1 — OCR Real Local (PaddleOCR)

| Campo | Detalhe |
|-------|---------|
| **Serviço** | `services/ocr` — FastAPI, porta **8008** |
| **Provider** | `OCR_PROVIDER=paddle`, `OCR_SERVICE_URL` |
| **Pipeline** | Hybrid: pdfjs (nativo) → Paddle (escaneado/imagem) → basic (fallback) |
| **Docs** | `docs/sprint-15.1-local-paddleocr.md` |
| **Status** | Concluída (validação manual pendente) |

## Sprint 15.0.2 — Hardening Revisão e Aprovação Segura

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Revisão humana transparente, PDF protegido, auditoria, bloqueio baixa confiança |
| **Threshold** | `AUTO_APPROVAL_THRESHOLD = 70` |
| **Status PDF** | `PASSWORD_REQUIRED` + `POST /api/import/documents/:id/password` |
| **Auditoria** | `FinancialDocumentAuditEvent` |
| **Docs** | `docs/sprint-15.0.2-document-review-hardening.md` |
| **Status** | Concluída |

## Sprint 15 — Captura Inteligente de Documentos

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Upload PDF/imagem → OCR → parser PIX/TED/Boleto/Cartão → sugestão → revisão humana → lançamento → aprendizado |
| **Módulo** | `src/modules/financial-documents/` |
| **APIs** | `/api/import/documents`, `/api/import/suggestions`, `/api/import/learning-patterns` |
| **UI** | `/dashboard/import`, `/dashboard/import/review`, `/dashboard/import/history` |
| **Vorcaro** | Intents `IMPORT_DOCUMENT`, `REVIEW_DOCUMENT` |
| **Telegram** | Documentos com botões inline de confirmação |
| **Docs** | `docs/sprint-15-intelligent-document-capture.md` |
| **Status** | Concluída |

## Sprint 14.9.3 — Humanização Consultiva da Auditoria

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Vorcaro como consultor financeiro; Health Score; top 5 melhorias; anti falsos positivos |
| **Serviços** | `VorcaroConsultativeResponseService`, `CategoryAuditPreferenceMemoryService` |
| **Domínio** | `category-audit-exemptions.ts`, `category-audit-health.ts` |
| **UI** | `/dashboard/categories/audit` — Health Score, prioridades humanas, debug técnico opcional |
| **Docs** | `docs/sprint-14.9.3-humanized-category-audit.md` |
| **Status** | Concluída |

## Sprint 14.9.2 — Auto-Correção Conversacional

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Context lock, critic de resposta, humanização, auto-regeneração |
| **Módulo** | `src/modules/vorcaro/conversation/` + pipeline em `vorcaro-tool-calling` |
| **Intents** | `CATEGORY_LIST`, `CARD_LIST` |
| **Debug** | `/dashboard/vorcaro/debug` (admin) |
| **Docs** | `docs/sprint-14.9.2-conversation-self-correction.md` |
| **Status** | Concluída |

## Sprint 14.9 — Auditoria Inteligente de Categorias

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Vorcaro analisa taxonomia e sugere melhorias sem mutação automática |
| **Módulo** | `src/modules/categories/` |
| **API** | `GET /api/categories/audit` |
| **Intent** | `CATEGORY_AUDIT` → tool `category_audit` |
| **UI** | `/dashboard/categories/audit` |
| **Docs** | `docs/sprint-14.9-category-taxonomy-audit.md` |
| **Status** | Concluída |

## Sprint 14.8 — UX, Performance e Dados Base

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Menu simplificado, hub Vorcaro, performance de navegação, categorias padrão |
| **Navegação** | `src/lib/navigation/dashboard-nav.ts` — 6 blocos, 16 itens |
| **Hub UI** | `/dashboard/vorcaro` |
| **Categorias** | `vorcaro-category-taxonomy.ts`, seed idempotente no login + `prisma db seed` |
| **Docs** | `docs/sprint-14.8-ux-performance-base-data.md`, `docs/sprint-14.8-performance-audit.md` |
| **Status** | Concluída |

## Sprint 14.7 — Homologação E2E

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Homologação funcional + hotfix M-01 (Inbox 404) |
| **Docs** | `docs/sprint-14.7-e2e-report.md` |
| **Status** | Concluída (condicional — Telegram manual pendente) |

## Sprint 14.6 — Estabilização Pós-Homologação

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Corrigir achados da homologação 14.5 sem novas features |
| **Correções** | `STRATEGIC_ADVICE`, Telegram inline, sinônimos intent, cache 5 min, reset senha, `/vorcaro`, 404 ownership |
| **APIs** | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` |
| **Tabelas** | `PasswordResetToken`, `User.passwordHash` |
| **Status** | Concluída |

## Sprint 14 — Follow-up Inteligente

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Pendências ativas pós-ações assistidas, backoff, auto-complete |
| **Módulo** | `src/modules/vorcaro/followups/` |
| **Rotas UI** | `/dashboard/vorcaro/followups` |
| **Status** | Concluída |

## Sprint 13 — Execução Assistida do Vorcaro

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Assist → Confirm → Execute — propostas de navegação com confirmação explícita |
| **Módulo** | `src/modules/vorcaro/actions/` |
| **Rotas UI** | `/dashboard/vorcaro/actions` |
| **Rotas API** | `GET /api/vorcaro/actions`, `GET /api/vorcaro/actions/:id`, `POST .../approve|reject|execute` |
| **Tabelas** | `VorcaroActionProposal` |
| **Serviços** | `VorcaroActionProposalService`, `VorcaroActionInterpreterService`, `VorcaroActionExecutorService` |
| **Integração** | Tool Calling → propostas; chat/Telegram → confirmação `sim`/`não` |
| **Status** | Concluída |

## Sprint 12 — Memória Financeira Longitudinal

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Trajetória, evolução e tendências financeiras ao longo do tempo |
| **Módulo** | `src/modules/financial-memory/` |
| **Rotas UI** | `/dashboard/vorcaro/timeline` |
| **Rotas API** | `GET /api/vorcaro/timeline|evolution|achievements`, `POST /api/cron/financial-timeline` |
| **Tabelas** | `FinancialTimelineEvent`, `FinancialMetricSnapshot`, `FinancialAchievement` (perfil de evolução sob demanda) |
| **Status** | Concluída |

## Sprint 11.1 — Vorcaro Intent Engine e Tool Calling

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Chat orientado por intenções e ferramentas internas; LLM apenas quando necessário |
| **Módulo** | `src/modules/vorcaro/intent/` |
| **Serviços** | `VorcaroIntentEngineService`, `VorcaroToolResolverService`, `VorcaroToolCallingService`, `VorcaroToolExecutorService`, `RulesAutomationTool`, cache e observabilidade |
| **Integração** | `VorcaroConversationService.sendMessage()` — tool-first, fallback LLM |
| **Status** | Concluída |

## Sprint 11 — Vorcaro Conversacional

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Chat conversacional LOGOS + Telegram com dados reais |
| **Rotas UI** | `/dashboard/vorcaro/chat` |
| **Rotas API** | `POST /api/vorcaro/chat`, `GET/POST /api/vorcaro/conversations`, `GET /api/vorcaro/conversations/[id]` |
| **Tabelas Prisma** | `VorcaroConversation`, `VorcaroMessage` |
| **Serviços** | `VorcaroConversationService`, `VorcaroContextAggregatorService`, `VorcaroConversationMemoryService`, `VorcaroPromptBuilderService` |
| **Status** | Concluída |

**Princípios transversais**

- **Multitenancy:** `userId` nunca vem do frontend; sempre `session.user.id` (Auth.js).
- **Monetário:** valores persistidos com `Decimal` no Prisma (nunca `float`/`number` no banco).
- **Determinismo:** motores de cálculo e IA usam apenas dados locais (`logos_financeiro`).

---

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

### Alertas Financeiros Inteligentes (Sprint 9)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Motor proativo de riscos e oportunidades com persistência, idempotência e auto-resolução. |
| **Rotas UI** | `/dashboard/alerts` |
| **Rotas API** | `GET /api/alerts`, `GET /api/alerts/summary`, `PATCH /api/alerts/[id]`, `POST /api/alerts/bulk-patch`, `POST /api/cron/financial-alerts` |
| **Tabelas Prisma** | `FinancialAlert` (migration `20260603120000_financial_alerts_sprint9`) |
| **Serviços** | `FinancialAlertEngineService`, `FinancialAlertRulesEvaluator`, `FinancialAlertQueryService`, `PrismaFinancialAlertRepository` |
| **Agendamento** | Cron `0 6 * * *` via `npm run alerts:engine` ou endpoint cron com `CRON_SECRET` |
| **Integrações** | Dashboard executivo (`ExecutiveAlertsCard`), Advisor (`alertas_financeiros`), `TelegramAlertFormatter` (preparação Sprint 10) |
| **Status** | **Concluído (Sprint 9)** |

### Consultor Financeiro Inteligente (Sprint 9.5)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Recomendações estruturadas, score de saúde, detectores de desperdício — IA não executa ações |
| **Rotas UI** | `/dashboard/advisor`, card ações no dashboard executivo |
| **Rotas API** | `GET /api/advisor/consultation`, `GET /api/advisor/insights` (payload estendido) |
| **Módulo** | `src/modules/financial-consultant` |
| **Tipos** | `AdvisorAction`, score, savings, duplicidades, money leaks |
| **Status** | **Concluído (Sprint 9.5)** |

### Memória do Advisor (Sprint 9.5A)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Dismiss 30 dias, click sem ocultar card, recomendações quantificadas (`ObjectiveMetric`) |
| **Tabela** | `AdvisorRecommendationState` |
| **Rotas API** | `POST /api/advisor/actions/:recommendationHash/dismiss`, `click`, `reactivate` |
| **Status** | **Concluído (Sprint 9.5A)** — aguardando tag `sprint-9.5-stable` |

### Central de Notificações (Sprint 10)

| Campo | Detalhe |
|-------|---------|
| **Objetivo** | Comunicação proativa multi-canal (Dashboard, Telegram, digest) |
| **Rotas UI** | `/dashboard/notifications` + badge no menu |
| **Rotas API** | `GET /api/notifications`, `GET /api/notifications/summary`, `PATCH /api/notifications/[id]`, `GET/PATCH /api/notifications/preferences`, cron digests |
| **Tabelas Prisma** | `Notification`, `NotificationPreference` (migration `20260604120000_notification_center_sprint10`) |
| **Integrações** | Alert engine → notificação ao criar alerta; bridge para advisor/detectores |
| **Status** | **Concluído (Sprint 10)** |

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
| `20260603120000_financial_alerts_sprint9` | Alertas Financeiros (Sprint 9) |
| `20260604120000_advisor_recommendation_state_sprint95a` | Memória Advisor (Sprint 9.5A) |
| `20260604120000_notification_center_sprint10` | Central de Notificações (Sprint 10) |

Legado arquivado: `prisma/migrations_archived_legacy/`, inventário em `docs/migrations-legacy-inventory.md`.

---

## Validação recomendada

```bash
npx prisma validate
npx prisma generate
npx tsc --noEmit
npm test -- --run
```
