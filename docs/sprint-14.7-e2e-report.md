# Sprint 14.7 — Relatório de Homologação Funcional E2E

**Data:** 2026-06-09  
**Ambiente:** Docker (Postgres `localhost:5433`, Redis `localhost:6380`), Next.js dev `localhost:3000`  
**Migrations:** 14 aplicadas — `Database schema is up to date`  
**Método:** smoke tests API + script `scripts/sprint-14.7-e2e-validation.ts` + regressão 429 testes + análise de código para blocos manuais

---

## Resumo executivo

| Métrica | Resultado |
|---------|-----------|
| Checks automatizados | **16 PASS / 0 FAIL** |
| Regressão unitária | **429/429 OK** |
| Blocos manuais (UI/Telegram) | **11 pendentes** de execução humana |
| Bugs CRÍTICOS | **0** |
| Bugs ALTOS | **0** |
| Bugs MÉDIOS | **1** (M-01 corrigido) |
| Bugs BAIXOS | **1** |

### Veredito de aprovação Sprint 15

**CONDICIONAL — não liberado automaticamente para Sprint 15.**

Motivo: os blocos 2–7, 10–12 e 11 (Telegram real) exigem validação manual no browser e no app Telegram, não executada nesta sessão automatizada. A infraestrutura e os fluxos validados por API/script estão **estáveis**.

---

## Ambiente

| Verificação | Evidência | Resultado |
|-------------|-----------|-----------|
| `docker compose ps` | postgres + redis Up (healthy) | **OK** |
| `npx prisma migrate status` | 14 migrations, up to date | **OK** |
| `npm run dev` | HTTP 200 em `/api/auth/session` | **OK** |
| Telegram | Token configurado em `.env`; webhook não exercitado nesta sessão | **Pendente manual** |

---

## Resultados por bloco

### Bloco 1 — Autenticação

| Fluxo | Resultado | Evidência |
|-------|-----------|-----------|
| `POST /api/auth/forgot-password` | **PASS** | HTTP 200, mensagem genérica |
| `POST /api/auth/reset-password` (token válido) | **PASS** | HTTP 200, `passwordHash` no DB |
| Token reutilizado | **PASS** | HTTP 404 |
| Token expirado | **PASS** | HTTP 404 |
| E-mail inválido | **PASS** | HTTP 400 |
| Cadastro dedicado | **GAP MÉDIO** | Não há rota/UI de signup; primeiro login cria usuário via Credentials |
| Login UI (correto/incorreto/inexistente) | **Pendente manual** | NextAuth `/api/auth/signin` |

### Bloco 2–7 — Lançamentos, parcelamentos, recebíveis, metas, alertas, timeline

| Resultado | Detalhe |
|-----------|---------|
| **Pendente manual** | Fluxos CRUD e saldos requerem navegação no dashboard com sessão autenticada |
| Evidência indireta | 429 testes de domínio (receivables, planning, alerts, cashflow) passando |

### Bloco 8 — Follow-ups

| Fluxo | Resultado | Evidência |
|-------|-----------|-----------|
| Auto-complete RECEIVED → COMPLETED | **PASS** | Script E2E + `vorcaro-entity-state-changed.handler.test.ts` |
| Backoff 1d→3d→7d / expiração 5º lembrete | **PASS** (unitário) | `vorcaro-followup-backoff.test.ts`, scheduler test |
| Criação pós-ação / dismiss UI / cron real | **Pendente manual** | |

### Bloco 9 — Vorcaro Chat

| Pergunta | Intent | LLM | Resultado |
|----------|--------|-----|-----------|
| Como estou financeiramente? | STATUS | false | **PASS** |
| Tenho pendências? | FOLLOWUPS | false | **PASS** |
| Quais alertas eu tenho? | ALERTS | false | **PASS** |
| Quais metas estão em risco? | GOALS | false | **PASS** |
| Como acelerar meu patrimônio? | STRATEGIC_ADVICE | true | **PASS** |
| O que você faria no meu lugar? | STRATEGIC_ADVICE | true | **PASS** |

Resposta determinística no chat real (sem chamar LLM) — **pendente manual** com `provider: deterministic` na mensagem salva.

### Bloco 10 — Execução assistida

| Verificação | Resultado |
|-------------|-----------|
| APIs sem sessão → 401 | **PASS** (`/api/vorcaro/actions`) |
| Fluxo Assist→Confirm→Execute completo | **Pendente manual** |

### Bloco 11 — Telegram

| Item | Resultado |
|------|-----------|
| Comandos `/status` … `/vorcaro` | **Pendente manual** (bot + chat vinculado) |
| Inline Aprovar/Rejeitar/Dismiss | **Pendente manual** (implementado em 14.6; callbacks no webhook) |
| Evidência indireta | `telegram-inline-actions.test.ts`, `vorcaro-telegram-commands.test.ts` |

### Bloco 12 — Dashboards

**Pendente manual** — navegação visual em `/dashboard`, `/dashboard/vorcaro/*`, etc.

### Bloco 13 — Segurança

| Verificação | Resultado |
|-------------|-----------|
| APIs protegidas sem token → 401 | **PASS** (timeline, followups, actions, alerts, receivables, executive-dashboard) |
| Follow-up dismiss sem sessão → 401 | **PASS** |
| Vorcaro/alertas/recebíveis cross-tenant → 404 | **PASS** (análise 14.5 + testes actions) |
| Inbox cross-tenant → 404 | **PASS** (hotfix 14.7 — M-01 corrigido) |

### Bloco 14 — Performance

| Verificação | Resultado |
|-------------|-----------|
| Cache refresh timeline 5 min | **PASS** — 2× `refresh()` = 1× `runForUser` |
| Evolution cache | **PASS** (unitário `financial-memory-cache.test.ts`) |
| Medição SLA no browser | **Pendente manual** |

---

## Bugs e inconformidades

### ~~MÉDIO — M-01: Inbox retorna 403 em ownership~~ **CORRIGIDO**

- **Hotfix Sprint 14.7:** ownership cross-tenant padronizado em **404** em todas as rotas Inbox
- **Rotas:** `inbox/[id]`, `inbox/[id]/confirm`, `smart-batch/execute`, `import`, `import/preview`, `import/confirm`
- **Testes:** `src/app/api/inbox/[id]/__tests__/route.test.ts`, `confirm/__tests__/route.test.ts`, `smart-batch/execute/__tests__/route.test.ts`

### MÉDIO — M-02: Ausência de fluxo de cadastro explícito

- **Detalhe:** usuário criado no primeiro `authorize` Credentials; não há tela/API de signup com validação de senha no cadastro
- **Impacto:** bloco 1 “Cadastro” do checklist não mapeia 1:1 para UX de produção
- **Severidade:** MÉDIO (produto/homologação)

### BAIXO — B-01: Forgot-password sem envio de e-mail

- **Detalhe:** em dev retorna `devResetToken` no JSON; produção precisa integração SMTP (não escopo 14.6)
- **Severidade:** BAIXO

---

## Evidências geradas

| Artefato | Caminho |
|----------|---------|
| Script E2E | `scripts/sprint-14.7-e2e-validation.ts` |
| Resultados JSON | `scripts/sprint-14.7-e2e-results.json` |
| Checklist | `docs/sprint-14.7-e2e-checklist.md` |

### Como reproduzir validação automatizada

```bash
docker compose up -d
npx prisma migrate deploy
npm run dev
# outro terminal:
npx tsx scripts/sprint-14.7-e2e-validation.ts
npm test -- --run
```

---

## Próximos passos para liberação Sprint 15

1. Executar checklist manual (blocos 2–7, 10–12, 11 Telegram) com 2 usuários para IDOR.
2. Definir UX de cadastro (signup) ou aceitar auto-provisionamento como comportamento oficial.
3. Reexecutar este relatório marcando itens manuais como PASS/FAIL.

---

## Referências

- [`docs/sprint-14.6-stabilization.md`](./sprint-14.6-stabilization.md)
- [`docs/sprint-14.5-homologation-report.md`](./sprint-14.5-homologation-report.md)
