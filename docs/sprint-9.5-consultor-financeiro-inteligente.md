# Sprint 9.5 — Consultor Financeiro Inteligente

**Data:** 2026-06-03  
**Escopo:** Motor determinístico de recomendações + integração IA (sem execução automática de ações).

---

## Arquitetura

Módulo `src/modules/financial-consultant/`:

| Serviço | Responsabilidade |
|---------|------------------|
| `IntelligentAdvisorService` | Orquestra consulta completa |
| `AdvisorActionBuilderService` | Gera `AdvisorAction` a partir de alertas, metas, recebíveis, detectores |
| `SubscriptionNameNormalizer` | Limpeza regex + dicionário + similaridade → `normalizedName` |
| `SubscriptionDetectorService` | Duplicidade por `normalizedName`, cartões/contas distintos |
| `MoneyLeakDetectorService` | Gastos invisíveis + tendência 3 meses (eleva prioridade) |
| `AdvisorActionGuardrailService` | Valida ações oficiais; sanitiza resposta do LLM |
| `SpendingHealthAnalyzerService` | Raio-X por categoria (delivery, streaming, taxas…) |
| `FinancialHealthScoreService` | Score 0–100 e classificação |
| `SmartSavingsOpportunitiesService` | Top 3 economias (impacto × esforço) |

Integrações:

- `GET /api/advisor/consultation` — payload completo
- `GET /api/advisor/insights` — consulta + `insights[]` legado
- `FinancialAdvisorService.ask` — injeta ações estruturadas no prompt (IA não inventa ações)
- `FinancialDataAggregatorService` — seção `consultor_financeiro`
- Dashboard executivo — card **Próximas Ações Recomendadas**
- `/dashboard/advisor` — score, resumo, top 3 economias, ações e riscos

---

## Modelo AdvisorAction

Campos: `id`, `type`, `title`, `description`, `priority`, `effort`, `effortWeight`, `target`, `estimatedImpact`, `metadata` (contrato por tipo em `advisor-action-metadata.ts`).

**Esforço:** LOW/1, MEDIUM/2, HIGH/3 — Top 3 usa `priorityScore = estimatedImpact / effortWeight`.

**Metadata mínimo:** `CollectReceivableMetadata`, `ReviewSubscriptionsMetadata`, `ReduceExpensesMetadata`, `ReviewSmallExpensesMetadata`, etc.

Tipos: `COLLECT_RECEIVABLE`, `VIEW_CREDIT_CARD`, `VIEW_GOAL`, `REDUCE_EXPENSES`, `REVIEW_INSTALLMENTS`, `REVIEW_SUBSCRIPTIONS`, `REVIEW_SMALL_EXPENSES`, `REDUCE_SUPERFLUOUS_EXPENSES`, `VIEW_ALERTS`, `VIEW_COMMITMENTS`.

Rotas: `src/modules/financial-consultant/domain/advisor-action-routes.ts`.

---

## APIs

### `GET /api/advisor/consultation`

Retorno: `summary`, `risks`, `recommendations`, `actions`, `healthScore`, `savingsOpportunities`, `subscriptionDuplicates`, `moneyLeaks`, `spendingHealth`, `generatedAt`.

### `GET /api/advisor/insights`

Mesmo payload + `insights[]` (mapeamento de riscos/ações para UI legada).

---

## Score financeiro

| Faixa | Classificação |
|-------|----------------|
| 90–100 | Excelente |
| 75–89 | Saudável |
| 60–74 | Atenção |
| 0–59 | Crítica |

Penalidades: alertas críticos/warning, comprometimento >80%, metas em risco, recebíveis atrasados, duplicidades, gastos invisíveis ≥ R$100/mês.

---

## Testes

- `financial-consultant/__tests__/*` — detectores, score, action builder
- `api/advisor/consultation/__tests__/route.test.ts`
- Ajustes nos testes do agregador (mock do consultor)

---

## Aditivo Sprint 9.5 (refinamentos)

- `SubscriptionNameNormalizer` — descrições sujas de cartão (ex.: `RENE*NETFLIX`, `SFTY*SPOTIFY`).
- Duplicidade em cartões/contas diferentes com `duplicateGroup`, `suspectedIds`, `potentialMonthlySaving`.
- Money leak com `trend` e elevação de prioridade após 3 meses de crescimento consecutivo.
- `AdvisorActionGuardrailService` — backend gera catálogo; LLM não inventa `actionId`.
- Dismiss de recomendações (`PENDING` / `DISMISSED` / `CLICKED`) — **Sprint 10**.

## Limitações / Sprint 10

- IA não executa ações (apenas recomenda).
- Sem envio Telegram automático nesta sprint.
- Dismiss de recomendações ignoradas (hash + 30 dias).
- Detecção de assinaturas baseada em recorrências ativas (não analisa extrato linha a linha de todos os cartões).
- `ask` + `aggregate` podem consultar o motor duas vezes (otimização futura).

---

## Não implementado (conforme spec)

Envio Telegram, execução automática, pagamentos/cancelamentos sem confirmação do usuário.
