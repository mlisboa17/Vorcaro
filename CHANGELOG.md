# Changelog

## [Unreleased]

### Added — Sprint 9 (Alertas Financeiros Inteligentes)

- Modelo `FinancialAlert` + enums (`FinancialAlertType`, `FinancialAlertSeverity`, `FinancialAlertStatus`); migration `20260603120000_financial_alerts_sprint9`.
- Idempotência via `fingerprint` + `@@unique([userId, fingerprint])` — no máximo um registro por condição; reabertura automática após `RESOLVED`.
- `FinancialAlertEngineService` + `FinancialAlertRulesEvaluator` — 7 regras (pagamento próximo, recebível atrasado, risco cartão, alto comprometimento, meta em risco, reembolso atrasado, fluxo negativo 15d) com auto-resolução.
- Agendamento: `POST /api/cron/financial-alerts` (Bearer `CRON_SECRET`) e `npm run alerts:engine` (cron `div 6 * * *`).
- APIs: `GET /api/alerts`, `GET /api/alerts/summary`, `PATCH /api/alerts/[id]`, `POST /api/alerts/bulk-patch` — paginação e filtros; `userId` somente da sessão.
- UI `/dashboard/alerts` + card executivo **Alertas Financeiros**.
- Advisor: seção `alertas_financeiros` (críticos, warnings, ações recomendadas).
- `TelegramAlertFormatter` — payload MarkdownV2 (sem envio nesta sprint).
- Logs estruturados JSON (`financial-alert-engine`).
- Testes: engine (idempotência, auto-resolução, reabertura), API, advisor, Telegram formatter.

### Added — Sprint 8 (Central de Compromissos Recorrentes)

- Read model `MonthlyCommitment` + `MonthlyCommitmentsService` (sem migration, sem tabela).
- API `GET /api/commitments/monthly?month=YYYY-MM` — auth via sessão; `userId` somente da sessão.
- UI `/dashboard/commitments` — cards, tabela e filtros (mês, origem, status, tipo, busca).
- Fontes consolidadas: recorrências (todas ocorrências do mês), parcelamentos, passivos (parcela mensal), consórcios, faturas de cartão, contas a receber, transações futuras agendadas.
- Deduplicação mínima segura por (descrição + data + valor).
- Integrações: Dashboard Executivo (`ExecutiveCommitmentsCard`), Advisor (`compromissos_recorrentes`).
- Testes: serviço, helpers, API route, agregador advisor (19+ testes no módulo).

### Added — Sprint 7.5 (Contas a Receber e Reembolsos)

- Modelo `Receivable` + enum `ReceivableStatus`; migration `20260603010000_receivables_sprint75`.
- Módulo `src/modules/receivables` — domínio (`ReceivableService`), repositório Prisma, use cases (criar, listar, cobrar parcial/total, cancelar, criar a partir de transação).
- APIs `GET/POST /api/receivables`, `POST /api/receivables/from-transaction`, `POST /api/receivables/[id]?action=collect|cancel` — `userId` somente da sessão.
- UI `/dashboard/receivables` — cards (total a receber, recebido, pendente, vencidos) e tabela de devedores.
- **Compra para terceiro:** seção no modal de transação; metadata `thirdPartyPurchase` / `receivableId`; exclusão da DRE pessoal em listagens e overview mensal.
- **Patrimônio:** `contasAReceber` no summary; ativo `RECEIVABLE` no PL.
- **Fluxo de caixa:** eventos `origem: RECEIVABLE` com descrição “Receita prevista”.
- **Advisor:** seção determinística de contas a receber no agregador (`contas_a_receber`).
- **Inbox:** detecção de possível reembolso (`detectPotentialReimbursement`) + hint com link manual (sem auto-criação).
- **Telegram:** `detectReceivableTelegramHint` — sugestão de conta a receber sem persistência automática.
- Testes: serviço, use cases, cashflow, integrações, agregador advisor (17+ testes no módulo).

### Added — Sprint 7 (Central de Parcelamentos — Fase 2 Integrações)

- **Advisor:** bloco determinístico de parcelamentos (`getSummary` + planos ativos) no agregador.
- **Insights:** concentração por cartão (≥60%), comprometimento futuro vs receita, fim de ciclo (1 parcela).
- **Cashflow:** eventos `origem: INSTALLMENT` via `getFutureCommitments` com anti-duplicidade vs `FATURA`.
- **API detalhe:** `GET /api/installments/[groupId]` com status `PAID`/`OPEN`/`OVERDUE` e 403 cross-tenant.
- **UI:** modal drill-down na central; card **Parcelamentos** no dashboard executivo.

### Added — Sprint 7 (Central de Parcelamentos — Fase 1 Read Model)

- Módulo `src/modules/installments` — `InstallmentReadModelService` (agregação somente leitura sobre `Transaction`).
- APIs `GET /api/installments`, `GET /api/installments/[groupId]` (auth via sessão; sem `userId` no cliente).
- UI `/dashboard/installments` — cards analíticos e tabela de planos; menu **Parcelamentos**.
- Métodos para integração futura: `getSummary`, `getFutureCommitments`; exports em `src/lib/api/installments.ts`.
- Regra determinística de parcela paga: `dataCaixa` → `dataVencimentoFatura` → `date`.
- Filtro de leitura para evitar dupla contagem (ex.: descrições “Pagamento Fatura”, “Pagamento QR Code”).
- Testes: agregação, cálculos, ownership, rota 404.
- **Sem migration** — fonte de verdade permanece `Transaction.installmentGroup`.

### Documentation — Sprint 6.5 (Fechamento Sprint 6 + preparação Sprint 7)

- Sprint 6 registrada como **concluída** em README e `docs/project-state.md`.
- `docs/sprint-7-impact-analysis.md` — módulos consumidores e dependências.
- `docs/installments-readiness.md` — inventário cartões, faturas, transações parceladas.
- `docs/installments-gap-analysis.md` — o que existe vs falta para a central.
- `docs/installments-advisor-plan.md` — integração futura no `FinancialAdvisorService`.
- `docs/installments-cashflow-plan.md` — alimentação dos horizontes 7–365 dias.
- `docs/installments-dashboard-plan.md` — KPIs e UI sugerida.
- `docs/installments-risk-matrix.md` — riscos CRÍTICO → BAIXO.

### Documentation — Sprint 5.5 (Consolidação e handoff)

- `docs/project-state.md` — inventário técnico por módulo (Sprints 1–5).
- `docs/architecture-overview.md` — mapa de `src/modules/` e dependências.
- `docs/api-inventory.md` — 58 operações HTTP documentadas.
- `docs/database-inventory.md` — 25 modelos e 24 enums.
- `docs/ai-architecture.md` — providers, fallback e serviços do Advisor.
- `docs/sprint-6-preparation.md` — escopo, reuso e critérios da Sprint 6.
- README: seção **Estado atual do projeto**.

### Added — Sprint 6 (Planejamento financeiro inteligente)

- Modelo `FinancialGoal` + enums; migration `financial_goals`.
- Arquitetura em 4 camadas: **Estratégia**, **Viabilidade**, **Priorização**, **Recomendação**.
- `FinancialGoalStrategyService` — cenários A (aporte → prazo) e B (data → aporte).
- `FinancialGoalViabilityService` — integração cashflow, risco LOW/MEDIUM/HIGH, comprometimento de margem.
- `FinancialGoalPrioritizationService` — ordem emergência → dívidas → curto prazo → patrimônio → aposentadoria.
- `FinancialGoalRecommendationService` — mensagens humanizadas, explicabilidade e sugestão de aceleração.
- APIs `/api/planning/goals`; UI `/dashboard/planning`; bloco executivo ampliado.
- Advisor: contexto de metas com recomendações e explicabilidade.
- Testes: estratégia, viabilidade, priorização, recomendação, ownership, projeção.

### Added — Sprint 5 (IA Financeira multi-provider)

- Módulo `src/modules/ai` — `AiProviderPort`, Groq/Gemini/OpenRouter, `AiRouterService` com fallback.
- Módulo `src/modules/financial-advisor` — agregação Prisma, `FinancialAdvisorService.ask()`, insights estáticos + IA.
- APIs `POST /api/advisor/ask`, `GET /api/advisor/insights`.
- UI `/dashboard/advisor` — chat, markdown, fontes, banner LOW confidence.
- Testes: router fallback, advisor LOW confidence, bloqueio de `userId` no body.

### Added — Sprint 4.7 (Telegram)

- Modelos `TelegramConnection` e `TelegramConnectCode` (vínculo multi-usuário).
- `POST /api/telegram/webhook` com validação `TELEGRAM_WEBHOOK_SECRET` (header `X-Telegram-Bot-Api-Secret-Token`).
- `GET|POST|DELETE /api/telegram/integration` — status, gerar código `/connect`, desvincular.
- Tela `/dashboard/settings/integrations` para vínculo e documentação ngrok/cloudflared.
- Ingestão Telegram (texto, voz, foto) na Caixa Financeira para chats vinculados.
- Testes: `connect-command`, `webhook-auth`, `generate-connect-code`.

### Changed

- Rota legada `/api/webhooks/telegram` delega para o novo webhook (compat. `?token=`).
- `.env.example` alinhado às portas Docker (5433/6380) e variáveis Telegram/Groq.

### Documentation

- `docs/migrations-legacy-inventory.md` (Sprint 4.6).
- README com seção Telegram ampliada.

## [0.1.0] — 2026-06-02

### Added

- Rebaseline Prisma (`init_clean_schema`) e arquivamento `migrations_archived_legacy`.
- Módulos: inbox, transações, recorrências, patrimônio, consórcios, fluxo de caixa, dashboard executivo.
