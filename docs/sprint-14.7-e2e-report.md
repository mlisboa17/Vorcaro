# Sprint 14.7 — Relatório de Homologação Funcional E2E

**Data:** 2026-06-04  
**Ambiente:** Docker (Postgres `localhost:5433`, Redis `localhost:6380`), Next.js dev `localhost:3001`  
**Migrations:** 14 aplicadas — `Database schema is up to date`  
**Método:** homologação manual via API/sessão (`scripts/sprint-14.7-manual-homologation.ts`) + smoke Playwright + script legado `sprint-14.7-e2e-validation.ts` + regressão 434 testes

---

## Resumo executivo

| Métrica | Resultado |
|---------|-----------|
| Homologação manual API (55 checks) | **52 PASS / 0 FAIL / 3 MANUAL** |
| Script E2E legado (16 checks) | **16 PASS / 0 FAIL** |
| Regressão unitária | **434/434 OK** |
| TypeScript / Prisma | **OK** |
| Smoke dashboards (Playwright) | **7/7 rotas HTTP 200, 0 erros 500 em APIs** |
| Bugs CRÍTICOS | **0** |
| Bugs ALTOS | **0** |
| Bugs MÉDIOS | **1** (M-02 cadastro) |
| Bugs BAIXOS | **2** (B-01 e-mail reset; B-02 timeline LLM) |

### Veredito de aprovação Sprint 15

**STATUS = CONDICIONAL — não liberado automaticamente para Sprint 15.**

Motivo: **Bloco 11 (Telegram real)** permanece pendente de validação humana no app Telegram (comandos + inline buttons). Todos os demais blocos foram exercitados via API autenticada, IDOR com 2 usuários, Vorcaro Chat, Execução Assistida e smoke visual de dashboards.

---

## Ambiente

| Verificação | Evidência | Resultado |
|-------------|-----------|-----------|
| `docker compose ps` | postgres + redis Up (healthy) | **PASS** |
| `npx prisma migrate status` | 14 migrations, up to date | **PASS** |
| `npm run dev` | HTTP 200 em `localhost:3001/api/auth/session` | **PASS** |
| Telegram | `TELEGRAM_BOT_TOKEN` presente em `.env` | **MANUAL** — webhook/comandos não exercitados nesta sessão |

---

## Resultados por bloco

### Bloco 1 — Autenticação

| Fluxo | Resultado | Evidência |
|-------|-----------|-----------|
| Login válido (Credentials + sessão JWT) | **PASS** | `scripts/sprint-14.7-manual-homologation.ts` — sessão criada |
| Senha inválida | **PASS** | Login rejeitado (cliente isolado, sem cookie residual) |
| Usuário inexistente + senha errada | **PASS** | Login rejeitado |
| `POST /api/auth/forgot-password` | **PASS** | HTTP 200 |
| Reset token válido | **PASS** | HTTP 200, `passwordHash` persistido |
| Token reutilizado | **PASS** | HTTP 404 |
| Token expirado | **PASS** | HTTP 404 |
| E-mail inválido | **PASS** | HTTP 400 (script legado) |
| Cadastro dedicado | **GAP M-02** | Auto-provisionamento no primeiro login; sem UI signup |

### Bloco 2 — Lançamentos financeiros

| Fluxo | Resultado | Evidência |
|-------|-----------|-----------|
| Criar receita | **PASS** | HTTP 201 |
| Criar despesa | **PASS** | HTTP 201 |
| Editar despesa | **PASS** | HTTP 200 |
| Excluir despesa | **PASS** | HTTP 200 (reverse) |
| Listar / filtrar | **PASS** | 2+ itens retornados |
| Dashboard atualizado | **PASS** | `GET /api/executive-dashboard` HTTP 200 |

### Bloco 3 — Parcelamentos

| Fluxo | Resultado | Evidência |
|-------|-----------|-----------|
| Criar parcelamento (cartão, 3×) | **PASS** | HTTP 201 |
| Listar grupos | **PASS** | 1 grupo retornado |
| Detalhe do grupo | **PASS** | HTTP 200 |
| Ownership cross-tenant | **PASS** | HTTP 404 (usuário B) |
| Editar / quitar parcela via UI | **MANUAL** | API cobre criação/leitura; baixa parcial via UI não exercitada |

**Nota:** parcelamento multi-parcela exige forma de pagamento **cartão** (`buildCreditCardAwareTransactions`); PIX com `parcelas > 1` não gera grupo.

### Bloco 4 — Recebíveis

| Fluxo | Resultado | Evidência |
|-------|-----------|-----------|
| Criar recebível | **PASS** | HTTP 201 |
| Receber parcialmente | **PASS** | HTTP 200 |
| Receber integralmente | **PASS** | `status=RECEIVED` |
| Cancelar | **PASS** | HTTP 200 |
| Auto-complete follow-up ao RECEIVED | **PASS** | Script legado + handler unitário |

### Bloco 5 — Metas

| Fluxo | Resultado | Evidência |
|-------|-----------|-----------|
| Criar meta | **PASS** | HTTP 201 |
| Editar meta | **PASS** | HTTP 200 |
| Concluir meta (`ACHIEVED`) | **PASS** | HTTP 200 |
| Meta em risco (seed) | **PASS** | HTTP 201 — usada no chat GOALS |

### Bloco 6 — Alertas

| Fluxo | Resultado | Evidência |
|-------|-----------|-----------|
| Listar alertas | **PASS** | HTTP 200 |
| Resolver (`RESOLVED`) | **PASS** | HTTP 200 |
| Dismiss (`DISMISSED`) | **PASS** | HTTP 200 |

### Bloco 7 — Timeline financeira

| Fluxo | Resultado | Evidência |
|-------|-----------|-----------|
| `GET /api/vorcaro/timeline` | **PASS** | HTTP 200 |
| `GET /api/vorcaro/evolution` | **PASS** | HTTP 200 |
| Chat: "Meu patrimônio cresceu?" | **PASS** | HTTP 200, `provider=deterministic` |
| Chat: "Como estava há 90 dias?" | **PASS** | HTTP 200, resposta gerada |
| Chat: "O que mudou este mês?" | **PASS** | HTTP 200, resposta gerada |

**Observação B-02:** as duas últimas perguntas rotearam para `provider=groq` (LLM) em vez de resposta 100% determinística. Respostas coerentes com dados reais do usuário de teste; revisar intent routing se o requisito for tool-only.

### Bloco 8 — Follow-ups

| Fluxo | Resultado | Evidência |
|-------|-----------|-----------|
| Dismiss manual autenticado | **PASS** | HTTP 200 |
| Listar follow-ups | **PASS** | HTTP 200 |
| Auto-complete RECEIVED → COMPLETED | **PASS** | Script legado |
| Backoff / expiração 5º lembrete | **PASS** (unitário) | `vorcaro-followup-backoff.test.ts` |
| Cron real / criação pós-ação UI | **MANUAL** | Não exercitado nesta sessão |

### Bloco 9 — Vorcaro Chat

| Pergunta | Modo | Provider | Resultado |
|----------|------|----------|-----------|
| Como estou financeiramente? | tool | deterministic | **PASS** |
| Tenho alertas? | tool | deterministic | **PASS** |
| Tenho pendências? | tool | deterministic | **PASS** |
| Quais metas estão em risco? | tool | deterministic | **PASS** |
| Como acelerar meu patrimônio? | llm | groq | **PASS** |

### Bloco 10 — Execução assistida

| Fluxo | Resultado | Evidência |
|-------|-----------|-----------|
| Proposta criada | **PASS** | `OPEN_TIMELINE` PENDING |
| Aprovar | **PASS** | HTTP 200 |
| Executar | **PASS** | `execution=EXECUTED` |
| Rejeitar | **PASS** | HTTP 200 |
| Proposta expirada | **PASS** | HTTP 410 ao aprovar |

Fluxo completo **Assist → Approve → Execute** validado via API autenticada.

### Bloco 11 — Telegram

| Item | Resultado | Evidência |
|------|-----------|-----------|
| `/status`, `/alertas`, `/metas`, `/recebiveis`, `/vorcaro` | **MANUAL** | Token configurado; requer chat vinculado + app Telegram |
| Inline Aprovar / Rejeitar / Dismiss | **MANUAL** | Callbacks implementados (testes unitários OK) |
| Evidência indireta | **PASS** | `telegram-inline-actions.test.ts`, `vorcaro-telegram-commands.test.ts` |

### Bloco 12 — Dashboards

| Rota | HTTP | APIs 5xx | Resultado |
|------|------|----------|-----------|
| `/dashboard` | 200 | 0 | **PASS** |
| `/dashboard/vorcaro/timeline` | 200 | 0 | **PASS** |
| `/dashboard/vorcaro/followups` | 200 | 0 | **PASS** |
| `/dashboard/vorcaro/chat` | 200 | 0 | **PASS** |
| `/dashboard/patrimony` | 200 | 0 | **PASS** |
| `/dashboard/advisor` | 200 | 0 | **PASS** |
| `/dashboard/vorcaro/actions` | 200 | 0 | **PASS** |

Smoke Playwright — sem erro 500 em chamadas `/api/*` durante navegação.

### Bloco 13 — Segurança (IDOR)

Teste com **Usuário A** e **Usuário B** (`scripts/sprint-14.7-manual-homologation.ts`):

| Recurso | Resultado | HTTP |
|---------|-----------|------|
| Inbox item | **PASS** | 404 |
| Meta | **PASS** | 404 |
| Recebível (collect) | **PASS** | 404 |
| Alerta (patch) | **PASS** | 404 |
| Follow-up (dismiss) | **PASS** | 404 |
| Parcelamento (detalhe) | **PASS** | 404 |
| Nenhum 403 em ownership Inbox | **PASS** | Hotfix M-01 |

### Bloco 14 — Performance

| Verificação | Resultado | Evidência |
|-------------|-----------|-----------|
| Cache refresh timeline 5 min | **PASS** | Script legado — 1× `runForUser` em 2× refresh |
| Timeline repetida (API) | **PASS** | HTTP 200/200 |
| Evolution repetida (API) | **PASS** | HTTP 200/200 |
| SLA browser (Network tab) | **MANUAL** | Não medido nesta sessão |

---

## Bugs e inconformidades

### ~~MÉDIO — M-01: Inbox retorna 403 em ownership~~ **CORRIGIDO**

- Hotfix Sprint 14.7: cross-tenant → **404** em todas as rotas Inbox auditadas
- Testes: `inbox/[id]`, `confirm`, `smart-batch/execute`

### MÉDIO — M-02: Ausência de fluxo de cadastro explícito

- Usuário criado no primeiro `authorize` Credentials; sem tela/API signup
- Impacto: bloco 1 “Cadastro” não mapeia 1:1 para UX de produção

### BAIXO — B-01: Forgot-password sem envio de e-mail

- Dev retorna `devResetToken` no JSON; produção precisa SMTP

### BAIXO — B-02: Perguntas de timeline podem rotear para LLM

- "Como estava há 90 dias?" e "O que mudou este mês?" usaram `provider=groq` na homologação
- Respostas válidas; alinhar intent se o requisito for 100% determinístico

---

## Evidências geradas

| Artefato | Caminho |
|----------|---------|
| Homologação manual API | `scripts/sprint-14.7-manual-homologation.ts` |
| Resultados manual JSON | `scripts/sprint-14.7-manual-results.json` |
| Script E2E legado | `scripts/sprint-14.7-e2e-validation.ts` |
| Resultados legado JSON | `scripts/sprint-14.7-e2e-results.json` |
| Checklist | `docs/sprint-14.7-e2e-checklist.md` |

### Como reproduzir

```bash
docker compose up -d
npx prisma migrate deploy
npm run dev
# outro terminal (ajustar porta se necessário):
$env:E2E_BASE_URL="http://localhost:3001"
npx tsx scripts/sprint-14.7-manual-homologation.ts
npx tsx scripts/sprint-14.7-e2e-validation.ts
npm test -- --run
npx tsc --noEmit
npx prisma validate
```

---

## Critério de liberação Sprint 15

| Critério | Status |
|----------|--------|
| Blocos 1–10, 12–14 executados | **OK** |
| Bloco 11 Telegram real | **PENDENTE** |
| Nenhum bug CRÍTICO / ALTO | **OK** |
| Banco íntegro | **OK** |
| Vorcaro / Timeline / Follow-ups / Execução Assistida | **OK** (API) |
| **LIBERADO PARA SPRINT 15** | **NÃO** — aguarda homologação Telegram |

---

## Referências

- [`docs/sprint-14.6-stabilization.md`](./sprint-14.6-stabilization.md)
- [`docs/sprint-14.5-homologation-report.md`](./sprint-14.5-homologation-report.md)
