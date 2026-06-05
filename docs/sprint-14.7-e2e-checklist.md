# Sprint 14.7 — Checklist Homologação Funcional E2E

> Validação manual em ambiente real. Sem novas features, refatorações ou mudanças arquiteturais.

**Ambiente validado em 2026-06-09:**
- [x] `docker compose ps` — postgres:5433 + redis:6380 healthy
- [x] `npx prisma migrate status` — **Database schema is up to date** (14 migrations)
- [x] `npm run dev` — servidor em `http://localhost:3000`
- [x] Regressão automatizada — **429 testes OK**

---

## Bloco 0 — Ambiente

- [x] Docker ativo
- [x] PostgreSQL ativo
- [x] Redis ativo
- [ ] Telegram conectado (webhook + chat vinculado) — **validação manual**
- [x] Migrations aplicadas

---

## Bloco 1 — Autenticação

### Cadastro
- [ ] Novo usuário via UI dedicada — **N/A**: auto-create no primeiro login Credentials
- [x] E-mail inválido em forgot-password → 400 (automatizado)
- [x] Reset senha < 8 chars → 400 (schema Zod)
- [ ] Usuário duplicado — **manual** (segundo login mesmo e-mail)

### Login
- [ ] Login correto — **manual** (`/api/auth/signin`, `AUTH_DEV_PASSWORD`)
- [ ] Senha incorreta — **manual**
- [ ] Usuário inexistente — **manual**

### Reset de senha
- [x] `POST /api/auth/forgot-password` — 200 (automatizado)
- [x] `POST /api/auth/reset-password` token válido — 200 (automatizado)
- [x] Token expirado — 404 (automatizado)
- [x] Token reutilizado — 404 (automatizado)
- [x] `passwordHash` persistido (automatizado)

---

## Bloco 2 — Lançamentos financeiros

- [ ] Criar receita — **manual**
- [ ] Criar despesa — **manual**
- [ ] Editar — **manual**
- [ ] Excluir — **manual**
- [ ] Categorias — **manual**
- [ ] Filtros — **manual**
- [ ] Saldos consistentes — **manual**

---

## Bloco 3 — Parcelamentos

- [ ] Criação — **manual**
- [ ] Edição — **manual**
- [ ] Baixa de parcelas — **manual**
- [ ] Exclusão — **manual**
- [x] Ownership outro usuário → 404 (teste unitário installments route)

---

## Bloco 4 — Recebíveis

- [ ] CRUD completo — **manual**
- [ ] Recebimento total/parcial — **manual**
- [x] Auto-complete follow-up ao RECEIVED (automatizado handler)

---

## Bloco 5 — Metas

- [ ] Criar / editar / concluir — **manual**
- [ ] Meta em risco no chat — **manual**
- [ ] Timeline + follow-up — **manual**

---

## Bloco 6 — Alertas

- [ ] Criar / editar / resolver / dismiss — **manual**
- [ ] Follow-up encerrado ao RESOLVED — **manual** (handler coberto em testes unitários)

---

## Bloco 7 — Timeline financeira

- [ ] “Meu patrimônio cresceu?” — **manual** (chat)
- [ ] “Como estava há 90 dias?” — **manual**
- [ ] “O que mudou este mês?” — **manual**
- [x] Cache 5 min na API timeline (automatizado)

---

## Bloco 8 — Follow-ups

- [x] Auto-complete RECEIVED → COMPLETED (automatizado)
- [ ] Criação após ação executada — **manual**
- [ ] Dismiss UI/API autenticada — **manual**
- [ ] Expiration após 5 lembretes — **manual** (cron) / testes unitários OK

---

## Bloco 9 — Vorcaro Chat

### Tool calling (sem LLM)
- [x] “Como estou financeiramente?” → STATUS (automatizado)
- [x] “Tenho pendências?” → FOLLOWUPS (automatizado)
- [x] “Quais alertas eu tenho?” → ALERTS (automatizado)
- [x] “Quais metas estão em risco?” → GOALS (automatizado)

### LLM
- [x] “Como acelerar meu patrimônio?” → STRATEGIC_ADVICE (automatizado)
- [x] “O que você faria no meu lugar?” → STRATEGIC_ADVICE (automatizado)

---

## Bloco 10 — Execução assistida

- [ ] Proposta criada — **manual**
- [ ] Aprovar / rejeitar / expirar — **manual**
- [x] Rotas API protegidas → 401 sem sessão (smoke test)

---

## Bloco 11 — Telegram

- [ ] `/status`, `/alertas`, `/metas`, `/recebiveis`, `/vorcaro` — **manual**
- [ ] Botões Aprovar / Rejeitar — **manual**
- [ ] Dismiss follow-up callback — **manual**

---

## Bloco 12 — Dashboards

- [ ] Dashboard principal — **manual**
- [ ] Timeline / Follow-ups / Chat / Metas / Alertas / Recebíveis — **manual**

---

## Bloco 13 — Segurança

- [x] APIs core sem sessão → 401 (smoke test)
- [x] Vorcaro / follow-ups / receivables / alerts — sem 403 nas rotas auditadas
- [ ] IDOR usuário A vs B — **manual** (2 contas)
- [x] Inbox cross-tenant → 404 (hotfix 14.7 M-01)

---

## Bloco 14 — Performance

- [x] Cache timeline refresh — 1 engine call em 5 min (automatizado)
- [ ] Evolution repetida no browser — **manual** (Network tab)

---

## Validação automatizada

- [x] `npm test -- --run` — 429 OK
- [x] `npx tsx scripts/sprint-14.7-e2e-validation.ts` — 16 PASS, 0 FAIL
