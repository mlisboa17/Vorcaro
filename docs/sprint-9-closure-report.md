# Relatório de Fechamento — Sprint 9 (Alertas Financeiros Inteligentes)

**Data:** 2026-06-03  
**Tag:** `sprint-9-stable`  
**Commit:** `feat(sprint-9): implement financial alert engine`

---

## Arquitetura

- **Persistência:** `FinancialAlert` no PostgreSQL via Prisma (`20260603120000_financial_alerts_sprint9`).
- **Idempotência:** campo `fingerprint` + constraint `@@unique([userId, fingerprint])` — uma linha por condição; reabertura ao voltar a `OPEN` após `RESOLVED`.
- **Motor:** `FinancialAlertEngineService` orquestra avaliação (`FinancialAlertRulesEvaluator`) e upsert/resolução (`PrismaFinancialAlertRepository`).
- **Agendamento:** script `npm run alerts:engine` e endpoint `POST /api/cron/financial-alerts` (Bearer `CRON_SECRET`) para cron externo `0 6 * * *`.
- **Camadas:** `src/modules/financial-alerts/{domain,application,infrastructure}` + APIs em `src/app/api/alerts`.

---

## Regras implementadas

| Tipo | Condição | Severidade | Auto-resolução |
|------|----------|------------|----------------|
| `UPCOMING_PAYMENT` | Saída pendente com vencimento em ≤7 dias | WARNING | Pagamento (`PAID`) |
| `OVERDUE_RECEIVABLE` | `expectedDate` < hoje e status aberto | WARNING | Recebimento confirmado |
| `CREDIT_CARD_RISK` | Faturas futuras > 30% da renda do mês | CRITICAL | Comprometimento abaixo do limite |
| `HIGH_COMMITMENT_MONTH` | Compromissos > 80% da renda | CRITICAL | Comprometimento normalizado |
| `GOAL_AT_RISK` | Meta ativa com viabilidade/atraso/risco alto | WARNING | Projeção volta a viável |
| `REIMBURSEMENT_DELAY` | Reembolso pendente > 15 dias | WARNING | Recebimento |
| `CASHFLOW_WARNING` | Saldo projetado negativo em 15 dias | CRITICAL | Projeção estável |

Renda de referência: `MonthFinancialOverviewService.getCurrentMonth().receitas`.

---

## APIs

- `GET /api/alerts` — paginação `page` / `pageSize`, filtros `status`, `severity`, `type`, `search`, `date`.
- `GET /api/alerts/summary` — totais e agrupamentos.
- `PATCH /api/alerts/:id` — `DISMISSED` / `RESOLVED`.
- `POST /api/alerts/bulk-patch` — lote até 100 ids.
- `POST /api/cron/financial-alerts` — execução global (sem sessão de usuário).

`userId` sempre de `session.user.id` nas rotas autenticadas.

---

## UI e integrações

- `/dashboard/alerts` — listagem, filtros, paginação, dismiss/resolver.
- Card **Alertas Financeiros** no dashboard executivo.
- Advisor: seção `alertas_financeiros` com riscos, ações recomendadas e impacto.
- `TelegramAlertFormatter` — payload MarkdownV2 (envio na Sprint 10).

---

## Testes e evidências

```text
npm test -- --run     → 248 passed
npx tsc --noEmit      → 0 erros
npx prisma validate   → OK
npx prisma generate   → OK
```

Cobertura nova:

- `financial-alert-engine.service.test.ts` — idempotência (3 execuções), auto-resolução, reabertura.
- `telegram-alert.formatter.test.ts`
- `api/alerts/__tests__/route.test.ts`
- `financial-data-aggregator.alerts.test.ts`

---

## Limitações conhecidas

1. **REIMBURSEMENT_DELAY:** heurística por `origem`/texto contendo “reembolso” — não há enum dedicado no `Receivable`.
2. **CASHFLOW_WARNING:** simulação diária simplificada sobre eventos do read model (não replica toda a curva do cashflow).
3. **Cron:** não há processo residente no `dev:all`; depende de cron externo ou execução manual do script.
4. **Notificações Telegram:** formatter pronto; envio não implementado nesta sprint.
5. Alertas `DISMISSED` não são reabertos automaticamente mesmo se a condição persistir (comportamento intencional).

---

## Variáveis de ambiente

| Variável | Uso |
|----------|-----|
| `CRON_SECRET` | Proteção do endpoint `POST /api/cron/financial-alerts` |
| `DATABASE_URL` | Persistência de alertas |

---

## Próximo passo (Sprint 10)

- Enfileirar/enviar digest via Telegram usando `TelegramAlertFormatter`.
- Opcional: reengajar alertas `DISMISSED` após N dias se condição crítica persistir.
