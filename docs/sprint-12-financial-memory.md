# Sprint 12 — Memória Financeira Longitudinal

## Objetivo

Transformar o Vorcaro de consultor do presente para consultor com **trajetória, evolução e tendências** ao longo do tempo — sem previsões de ML nem canais externos.

## Arquitetura

```text
Triggers (cron / API timeline / Vorcaro tools)
  ↓
FinancialTimelineEngineService (idempotente)
  ↓
Persistido (Prisma)
  · FinancialMetricSnapshot (diário)
  · FinancialTimelineEvent (fingerprint)
  · FinancialAchievement (conquistas)
  ↓
Cálculo sob demanda (sem tabela)
  · FinancialEvolutionProfileService → tendências (health, caixa, gastos, dívida, metas, patrimônio)
  · FinancialComparisonService (30/90/180/365 dias)
  · EvolutionHealthScoreService
  ↓
Vorcaro Intent Engine + Tools + Dashboard
```

## Modelos Prisma

| Modelo | Função |
|--------|--------|
| `FinancialTimelineEvent` | Marcos event-driven (`@@unique([userId, fingerprint])`, id `cuid`) |
| `FinancialMetricSnapshot` | Snapshot diário para comparações temporais |
| `FinancialAchievement` | Conquistas desbloqueadas (`achievementKey` único) |

Não existe model `FinancialEvolutionProfile` no Prisma. As tendências vêm de **`FinancialEvolutionProfileService.compute()`**, que agrega snapshots e comparações em memória a cada requisição.

### Fingerprint (idempotência + deduplicação temporal)

Formato: `{userId}:{eventType}:{periodOrEntityKey}`

Exemplos:

- `USER123:NET_WORTH_INCREASE:2026-06` (um evento por mês, não por dia)
- `USER123:GOAL_COMPLETED:GOAL_ABC` (uma vez por meta)
- `USER123:SPENDING_REDUCTION:MONTHLY:2026-Q2`

Migration: `prisma/migrations/20260606120000_financial_memory_sprint12`

## Engine — regras idempotentes

| Regra | Evento |
|-------|--------|
| Patrimônio ±10% em 30d | `NET_WORTH_INCREASE` / `NET_WORTH_DECREASE` |
| Caixa positivo 2 meses | `CASHFLOW_IMPROVEMENT` |
| Caixa piorando | `CASHFLOW_DETERIORATION` |
| Dívida ±5% em 30d | `DEBT_REDUCTION` / `DEBT_INCREASE` |
| Meta `ACHIEVED` | `GOAL_COMPLETED` |
| Metas em risco | `GOAL_AT_RISK` |
| Metas com progresso | `GOAL_PROGRESS` |
| Money leaks detectados | `MONEY_LEAK_DETECTED` |
| Gastos ±8–15% m/m | `SPENDING_REDUCTION` / `SPENDING_INCREASE` |

## APIs

| Método | Rota | Auth |
|--------|------|------|
| GET | `/api/vorcaro/timeline` | Sessão (`page`, `pageSize`) |
| GET | `/api/vorcaro/evolution` | Sessão |
| GET | `/api/vorcaro/achievements` | Sessão (`page`, `pageSize`) |
| POST | `/api/cron/financial-timeline` | `Bearer CRON_SECRET` |

## Vorcaro — novas intenções

| Intenção | Tool (classe) |
|----------|----------------|
| `TIMELINE` | `FinancialTimelineTool` |
| `EVOLUTION` | `FinancialEvolutionTool` |
| `ACHIEVEMENTS` | `FinancialAchievementTool` |
| `TRENDS` | `FinancialTrendTool` |

## Guardrail de histórico

Se `historyDaysAvailable < 30` em comparações/evolução/tendências:

> *"Não há histórico suficiente para uma análise confiável."*

Sem inventar dados.

## UI

- Rota: `/dashboard/vorcaro/timeline`
- Componente: `VorcaroTimelineDashboard`
- Menu: **Memória Financeira** (grupo Visão Executiva)

## Observabilidade

Métricas in-process (`financialMemoryObservability`):

- `timeline_events_created`
- `evolution_queries`
- `achievement_unlocked`
- `trend_detected`

## Módulo

`src/modules/financial-memory/`

## Validação

```bash
npm test -- --run
npx tsc --noEmit
npx prisma validate
```

## Fora de escopo

- Previsões futuras / ML
- WhatsApp
- Atualizações automáticas sem trigger definido (cron + API + tools Vorcaro)
