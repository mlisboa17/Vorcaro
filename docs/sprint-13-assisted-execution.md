# Sprint 13 — Execução Assistida do Vorcaro

## Objetivo

Inaugurar o padrão **Assist → Confirm → Execute**: o Vorcaro propõe ações de **navegação** no dashboard; o usuário confirma no chat, Telegram ou painel; a execução retorna apenas `targetUrl` / `navigationPayload` — **sem alterar dados financeiros**.

## Modelo Assist → Confirm → Execute

```text
Assist   — Tool Calling / consulta detecta oportunidade → createProposal (PENDING, 15 min)
Confirm  — Usuário: "sim" / Aprovar (API ou dashboard) → APPROVED
Execute  — executeProposal → EXECUTED + targetUrl (navegação)
```

Rejeição: `"não"` / Rejeitar → `REJECTED`.  
Expiração automática: `PENDING` com `expiresAt` vencido → `EXPIRED`.

## VorcaroActionProposal

Migration: `prisma/migrations/20260607120000_vorcaro_action_proposals_sprint13`

| Campo | Função |
|-------|--------|
| `actionType` | Catálogo `VorcaroActionType` (11 tipos) |
| `payload` | JSON com ids de entidade + `fingerprint` lógico |
| `status` | Ciclo de vida (enum Prisma) |
| `expiresAt` | Criado com now + 15 min (`VORCARO_ACTION_EXPIRATION_MINUTES`) |

Deduplicação: se já existir `PENDING` equivalente (mesmo `actionType` + `payload.fingerprint`) e não expirada, **reutiliza** a proposta existente.

## Status

| Status | Significado |
|--------|-------------|
| `PENDING` | Aguardando confirmação |
| `APPROVED` | Confirmada, pronta para executar |
| `REJECTED` | Usuário recusou |
| `EXECUTED` | Navegação concluída (registro lógico) |
| `FAILED` | Falha ao montar destino |
| `EXPIRED` | Prazo de 15 min vencido |

## Catálogo de ações (`VorcaroActionType`)

`OPEN_RECEIVABLE`, `OPEN_ALERT`, `OPEN_GOAL`, `OPEN_COMMITMENT`, `OPEN_SUBSCRIPTION`, `OPEN_MONEY_LEAK`, `CREATE_RULE_SUGGESTION`, `CREATE_GOAL_SUGGESTION`, `OPEN_TIMELINE`, `OPEN_NOTIFICATION`, `OPEN_DASHBOARD_SECTION`.

Módulo: `src/modules/vorcaro/actions/`

## APIs

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/vorcaro/actions` | Lista propostas (`?status=PENDING`, etc.) |
| GET | `/api/vorcaro/actions/:id` | Detalhe (ownership) |
| POST | `/api/vorcaro/actions/:id/approve` | Aprova `PENDING` não expirada |
| POST | `/api/vorcaro/actions/:id/reject` | Rejeita `PENDING` |
| POST | `/api/vorcaro/actions/:id/execute` | Executa `APPROVED`; retorna `VorcaroActionExecutionResult` |

Auth: sessão obrigatória. `userId` sempre de `session.user.id`.

## Dashboard

Rota: **`/dashboard/vorcaro/actions`**

Filtros por status; ações Aprovar / Rejeitar / Executar; link **Abrir destino** quando `EXECUTED`.

## Telegram

Mensagens `sim`, `não`, `confirmar`, `cancelar`, `abrir`, `executar` roteadas ao mesmo `VorcaroConversationService` (via `shouldRouteToVorcaroChat`).

Interpreter considera apenas a **última proposta `PENDING` não expirada criada nos últimos 5 minutos** (`VORCARO_ACTION_INTERPRETER_MAX_AGE_MINUTES`).

## Guardrails

- Multitenancy: `findByIdForUser` — proposta de outro usuário → `NOT_FOUND`
- Proposta expirada não pode ser aprovada → `EXPIRED` (HTTP 410)
- Rate limit: criação 40/h; mutações 60/h (approve/reject/execute)
- Execução **somente navegação** — sem CRUD financeiro
- Chat: confirmação chama `approveAndExecute` em sequência

## O que executa nesta sprint

- Abrir telas do dashboard (`targetUrl`)
- Retornar `navigationPayload` (ids para deep link)
- Persistir ciclo de vida da proposta
- Refresh de timeline (Sprint 12) continua separado — não é “execução” de ação Vorcaro

Mapeamento principal:

| Tipo | Destino |
|------|---------|
| `OPEN_RECEIVABLE` | `/dashboard/receivables?id=...` |
| `OPEN_ALERT` | `/dashboard/alerts?id=...` |
| `OPEN_GOAL` | `/dashboard/planning?goal=...` |
| `OPEN_COMMITMENT` | `/dashboard/commitments` |
| `OPEN_SUBSCRIPTION` | `/dashboard/recurring` |
| `OPEN_MONEY_LEAK` | `/dashboard/transactions` |
| `OPEN_TIMELINE` | `/dashboard/vorcaro/timeline` |
| `OPEN_NOTIFICATION` | `/dashboard/notifications?id=...` |
| `CREATE_RULE_SUGGESTION` | `/dashboard/rules` |
| `CREATE_GOAL_SUGGESTION` | `/dashboard/planning` |

## O que NÃO executa nesta sprint

- Criar regra ou meta real
- Cobrar recebível
- Alterar / excluir transação
- Cancelar assinatura
- Executar pagamento
- Qualquer mutação em dados financeiros via Vorcaro

## Limitações

- Confirmação no chat/Telegram: janela de **5 minutos** desde a criação da proposta (além dos 15 min de expiração)
- Deduplicação via `payload.fingerprint` — sem coluna dedicada no Prisma
- Rate limits in-process por contagem no banco (não Redis)
- Máximo 3 propostas sugeridas por resposta tool
- API `execute` exige status `APPROVED` (fluxo chat faz approve + execute)

## Observabilidade

Contadores in-process (`vorcaroActionObservability`):

`action_proposal_created`, `action_proposal_reused`, `action_proposal_approved`, `action_proposal_rejected`, `action_proposal_expired`, `action_executed`, `action_failed`

## Testes

| Arquivo | Cobertura |
|---------|-----------|
| `vorcaro-action-proposal.service.test.ts` | create, dedup, approve, reject, execute, expire, ownership |
| `vorcaro-action-interpreter.service.test.ts` | confirmação/rejeição, proposta recente, **proposta >5 min ignorada** |
| `vorcaro-action-chat-flow.test.ts` | fluxo "sim" sem proposta elegível |
| `actions-routes.test.ts` | approve/reject/execute HTTP, expirada, cross-user |
| `vorcaro-telegram-commands.test.ts` | roteamento sim/não |
| `vorcaro-action-navigation.test.ts` | mapeamento de URLs |
| `vorcaro-action-fingerprint.test.ts` | fingerprints lógicos |

Validação:

```bash
npm test -- --run
npx tsc --noEmit
npx prisma validate
npx prisma generate
```

## Integração chat

`VorcaroConversationService.sendMessage()`:

1. Se mensagem interpretável → `tryHandleActionInterpretation` (antes de Intent/LLM)
2. Tool Calling → `deriveSuggestedActionsFromToolResults` → `createProposal` + CTA no formatter

Factory: `buildVorcaroActionProposalService()` em `src/lib/api/vorcaro-actions.ts`.
