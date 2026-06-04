# Changelog

## [Unreleased]

### Added — Sprint 12 (Memória Financeira Longitudinal)

- Modelos `FinancialTimelineEvent`, `FinancialMetricSnapshot`, `FinancialAchievement` (ids `cuid`); migration `20260606120000_financial_memory_sprint12`.
- Fingerprint `{userId}:{eventType}:{periodo}` — engine idempotente, deduplicação por mês/entidade.
- `FinancialEvolutionProfileService` calculado sob demanda (sem tabela).
- `FinancialTimelineEngineService` — engine idempotente (patrimônio, caixa, dívida, metas, money leak, gastos).
- `FinancialComparisonService` — comparações 30/90/180/365 dias; `EvolutionHealthScoreService`; `FinancialAchievementService`.
- APIs: `GET /api/vorcaro/timeline|evolution|achievements`, `POST /api/cron/financial-timeline`.
- Vorcaro: intenções `TIMELINE`, `EVOLUTION`, `ACHIEVEMENTS`, `TRENDS` + guardrail de histórico mínimo 30 dias.
- UI `/dashboard/vorcaro/timeline` — linha do tempo, tendências e conquistas.
- Observabilidade: `timeline_events_created`, `evolution_queries`, `achievement_unlocked`, `trend_detected`.
- Doc: [`docs/sprint-12-financial-memory.md`](docs/sprint-12-financial-memory.md).

### Added — Sprint 11.1 (Vorcaro Intent Engine e Tool Calling)

- **Intent Engine:** `VorcaroIntentEngineService` com enum `VorcaroIntent` (STATUS, ALERTS, RECEIVABLES, GOALS, EXPENSES, CASHFLOW, COMMITMENTS, SUBSCRIPTIONS, MONEY_LEAK, HEALTH_SCORE, NOTIFICATIONS, RULES_AUTOMATIONS, GENERAL_CHAT, UNKNOWN).
- **Tool Resolver:** `VorcaroToolResolverService` mapeia intenção → ferramentas internas.
- **Tool Calling:** `VorcaroToolCallingService` executa múltiplas ferramentas (ex.: STATUS → health + alertas + metas + money leak + compromissos).
- **RulesAutomationTool:** explica regras, padrões aprendidos e taxonomia — somente leitura (sem CRUD automático).
- **Contrato:** `VorcaroToolResult` (title, summary, facts, metrics, recommendations).
- **Respostas sem IA:** perguntas simples e comandos `/status`, `/alertas`, etc. respondem via formatter FIA determinístico.
- **Fallback IA:** perguntas estratégicas/abertas continuam no LLM com métrica `fallback_to_llm`.
- **Observabilidade:** `intent_detected`, `tool_called`, `tool_only_response`, `llm_called`, `fallback_to_llm`.
- **Cache:** intent + tool result, TTL 60s.
- Doc: [`docs/sprint-11.1-intent-engine.md`](docs/sprint-11.1-intent-engine.md).

### Added — Sprint 11 (Vorcaro Conversacional)

- Modelos `VorcaroConversation` e `VorcaroMessage`; migration `20260605120000_vorcaro_conversational_sprint11`.
- **Vorcaro Chat Engine:** `VorcaroConversationService`, agregador unificado, memória de tópico, prompt builder, health score conversacional.
- UI `/dashboard/vorcaro/chat` — chat persistente com tom configurável (Sprint 10.5).
- APIs: `POST /api/vorcaro/chat`, `GET/POST /api/vorcaro/conversations`, `GET /api/vorcaro/conversations/[id]`.
- Telegram conversacional: comandos `/status`, `/alertas`, `/gastos`, `/metas`, `/oportunidades`, `/recebiveis`, `/vorcaro` e perguntas `Vorcaro, ...`.
- Guardrails, rate limit (60/h WEB, 30/h Telegram), multitenancy, cache de contexto 60s.
- Doc: [`docs/sprint-11-vorcaro-conversacional.md`](docs/sprint-11-vorcaro-conversacional.md).

### Added — Sprint 10 (Central de Notificações Inteligentes)

- Modelos `Notification` e `NotificationPreference`; migration `20260604120000_notification_center_sprint10`.
- `NotificationCenterService` — publicação multi-canal, deduplicação por fingerprint, entrega Dashboard/Telegram.
- Preferências por tipo: Dashboard ON, Telegram OFF, Digest ON (padrão).
- UI `/dashboard/notifications` + badge no menu lateral.
- Telegram: envio real MarkdownV2; rate limit 3/h; tipos imediatos (recebível, fluxo, meta, comprometimento).
- Digest diário (08:00) e semanal (segunda 08:00) via cron + scripts npm.
- Integração: `FinancialAlertEngineService` → notificação ao criar alerta.
- Testes: deduplicação, preferências, Telegram rate limit, digest diário/semanal.

### Added — Sprint 9.5A (Memória do Advisor)

- Modelo `AdvisorRecommendationState` + enums `AdvisorRecommendationStatus`, `DismissReason`; migration `20260604120000_advisor_recommendation_state_sprint95a`.
- `AdvisorRecommendationHashService` (SHA-256 determinístico, sem texto de IA) injetado em cada `AdvisorAction`.
- Memória: dismiss oculta 30 dias; click incrementa contador sem esconder card; filtro na consulta.
- APIs: `POST /api/advisor/actions/:hash/dismiss|click|reactivate` com guardrails multi-tenant (403 cross-user, 400 hash inválido).
- `ObjectiveMetric` + linguagem objetiva quantificada; guardrail de linguagem no LLM.

### Added — Sprint 9.5 (Consultor Financeiro Inteligente)

- Módulo `financial-consultant` — `AdvisorAction`, detectores (assinaturas duplicadas, gastos invisíveis, raio-X de gastos), score 0–100, top 3 economias.
- **Aditivo 9.5:** metadata tipado por ação, `effort`/`effortWeight`, `SubscriptionNameNormalizer`, duplicidade cross-cartão, tendência em money leak, Top 3 por `priorityScore`, `AdvisorActionGuardrailService`.
- `IntelligentAdvisorService` + `GET /api/advisor/consultation`; `GET /api/advisor/insights` estendido com `summary`, `risks`, `recommendations`, `actions`, `healthScore`.
- IA Financeira consome apenas ações geradas pelo backend (guardrail + prompt reforçado).
- Card **Próximas Ações Recomendadas** no dashboard executivo; UI do advisor com score e economias.
- Mapeamento de ações → rotas (`/dashboard/receivables`, `/dashboard/planning`, etc.).

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
