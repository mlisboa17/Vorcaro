# Sprint 14 — Follow-up Inteligente e Pendências Ativas

## Objetivo

Fechar o ciclo de vida das interações assistidas do Vorcaro (Sprint 13) com pendências persistentes, lembretes com backoff e encerramento automático quando a entidade relacionada é resolvida.

## Modelo de dados

- `VorcaroFollowUp` + enum `VorcaroFollowUpStatus` (`PENDING`, `ACTIVE`, `COMPLETED`, `DISMISSED`, `EXPIRED`)
- `fingerprint` determinístico: `{relatedEntityType}:{relatedEntityId}:{actionType}`
- Índice único `(userId, fingerprint)` — impede duplicidade para o mesmo fato gerador
- `version` — optimistic locking nas atualizações do scheduler

Migration: `20260608120000_vorcaro_followups_sprint14`

## Handlers (invocação direta)

Não há Event Bus no projeto. Os handlers são chamados explicitamente nos pontos de integração:

| Handler | Interface | Integração |
|---------|-----------|------------|
| `VorcaroActionExecutedHandler` | `onActionExecuted` | `VorcaroActionProposalService.executeProposal` após `EXECUTED` |
| `VorcaroEntityStateChangedHandler` | `onEntityStateChanged` | Recebível `RECEIVED`, meta `ACHIEVED`, alerta `RESOLVED` |

Factory: `src/lib/api/vorcaro-followups.ts` (`getVorcaroActionExecutedHandler`, `getVorcaroEntityStateChangedHandler`).

## Backoff e scheduler

`VorcaroFollowUpSchedulerService` — cron `POST /api/cron/vorcaro-followups` (header `Authorization: Bearer CRON_SECRET`).

Registros `ACTIVE` com `nextCheckAt <= now`:

1. Publica notificação (`NotificationCenterService` → dashboard/Telegram conforme preferências)
2. Incrementa `checkCount`, atualiza `lastReminderAt`
3. Recalcula `nextCheckAt`:
   - após 1º lembrete (`checkCount=1`) → +3 dias
   - após 2º+ (`checkCount>=2`) → +7 dias
4. Criação inicial: primeiro check em +1 dia
5. Após **5 lembretes** enviados → `EXPIRED`

## Auto-complete

| Entidade | Status terminal | Ação |
|----------|-----------------|------|
| `RECEIVABLE` | `RECEIVED` | `COMPLETED` nos follow-ups `PENDING`/`ACTIVE` |
| `GOAL` | `ACHIEVED` | idem |
| `ALERT` | `RESOLVED` | idem |

### Limitação técnica (fora de escopo)

**MONEY_LEAK** e **SUBSCRIPTION** exigem heurísticas de resolução mais complexas (detecção de cancelamento, confirmação de vazamento corrigido, etc.). Não há auto-complete para esses tipos nesta sprint — apenas follow-ups ligados a ações com entidade `RECEIVABLE`, `GOAL` ou `ALERT`.

## Chat e API (sem LLM)

- Intenção `FOLLOWUPS` no `VorcaroIntentEngine`
- Tool `follow_ups` (`FollowUpTool`) — consulta direta ao banco por `userId`, resposta via formatter determinístico
- `GET /api/vorcaro/followups?status=`
- `POST /api/vorcaro/followups/:id/dismiss`

## Dashboard

`/dashboard/vorcaro/followups` — filtros por status, ação **Dispensar** (não altera dados financeiros).

## Guardrails

- Follow-up **não** executa baixas, exclusões de metas, cancelamento de assinaturas ou mutações financeiras
- Sem integração WhatsApp nesta branch
