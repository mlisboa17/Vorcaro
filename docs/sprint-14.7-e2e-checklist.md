# Sprint 14.7 — Checklist Homologação Funcional E2E

> Validação em ambiente real. Sem novas features, refatorações ou mudanças arquiteturais.

**Homologação executada em 2026-06-04:**
- [x] Docker postgres:5433 + redis:6380 healthy
- [x] Migrations up to date (14)
- [x] Dev server `localhost:3001`
- [x] Regressão **434 testes OK**
- [x] Homologação manual API **52 PASS / 0 FAIL** (`scripts/sprint-14.7-manual-homologation.ts`)
- [ ] Telegram real (comandos + inline) — **pendente**

---

## Bloco 0 — Ambiente

- [x] Docker ativo
- [x] PostgreSQL ativo
- [x] Redis ativo
- [ ] Telegram conectado (webhook + chat vinculado)
- [x] Migrations aplicadas

---

## Bloco 1 — Autenticação

### Cadastro
- [ ] Novo usuário via UI dedicada — **N/A** (auto-create Credentials)
- [x] E-mail inválido forgot-password → 400
- [x] Reset senha token válido / expirado / reutilizado

### Login
- [x] Login correto — sessão JWT criada
- [x] Senha incorreta — rejeitado
- [x] Usuário inexistente — rejeitado

### Reset de senha
- [x] forgot-password → 200
- [x] reset-password token válido → 200
- [x] Token expirado → 404
- [x] Token reutilizado → 404

---

## Bloco 2 — Lançamentos financeiros

- [x] Criar receita (API)
- [x] Criar despesa (API)
- [x] Editar (API)
- [x] Excluir (API)
- [x] Listar / filtrar (API)
- [x] Dashboard executive → 200
- [ ] Validação visual saldos no browser

---

## Bloco 3 — Parcelamentos

- [x] Criação com cartão 3× (API)
- [x] Listagem grupos (API)
- [x] Detalhe grupo (API)
- [x] Ownership cross-tenant → 404
- [ ] Edição / baixa parcela via UI

---

## Bloco 4 — Recebíveis

- [x] Criar (API)
- [x] Receber parcial (API)
- [x] Receber integral (API)
- [x] Cancelar (API)
- [x] Auto-complete follow-up RECEIVED (handler)

---

## Bloco 5 — Metas

- [x] Criar / editar / concluir (API)
- [x] Meta em risco no chat GOALS (API)

---

## Bloco 6 — Alertas

- [x] Listar / resolver / dismiss (API)

---

## Bloco 7 — Timeline financeira

- [x] API timeline + evolution
- [x] Chat "Meu patrimônio cresceu?" (deterministic)
- [x] Chat "Como estava há 90 dias?" (resposta OK; LLM groq — ver B-02)
- [x] Chat "O que mudou este mês?" (resposta OK; LLM groq — ver B-02)

---

## Bloco 8 — Follow-ups

- [x] Dismiss autenticado (API)
- [x] Auto-complete RECEIVED (automático)
- [x] Backoff / expiração (unitário)
- [ ] Cron real / criação pós-ação UI

---

## Bloco 9 — Vorcaro Chat

- [x] Tool calling (4 perguntas) — deterministic
- [x] LLM strategic advice — groq

---

## Bloco 10 — Execução assistida

- [x] Criar → Aprovar → Executar (API)
- [x] Rejeitar (API)
- [x] Expirada → 410 (API)

---

## Bloco 11 — Telegram

- [ ] `/status`, `/alertas`, `/metas`, `/recebiveis`, `/vorcaro`
- [ ] Botões Aprovar / Rejeitar / Dismiss

---

## Bloco 12 — Dashboards

- [x] Smoke Playwright — 7 rotas HTTP 200, 0 APIs 5xx
- [ ] Validação visual completa com sessão persistente

---

## Bloco 13 — Segurança

- [x] IDOR A vs B — 404 em inbox, meta, recebível, alerta, follow-up, parcelamento
- [x] Inbox cross-tenant → 404 (M-01)
- [x] Sem 403 ownership Inbox

---

## Bloco 14 — Performance

- [x] Cache timeline 5 min (unitário/script legado)
- [x] Timeline/evolution repetida API → 200
- [ ] SLA browser Network tab

---

## Validação automatizada

- [x] `npm test -- --run` — 434 OK
- [x] `npx tsc --noEmit`
- [x] `npx prisma validate`
- [x] `npx tsx scripts/sprint-14.7-e2e-validation.ts` — 16 PASS
- [x] `npx tsx scripts/sprint-14.7-manual-homologation.ts` — 52 PASS, 0 FAIL

---

## Veredito

**CONDICIONAL** — liberar Sprint 15 após homologação Telegram (Bloco 11).
