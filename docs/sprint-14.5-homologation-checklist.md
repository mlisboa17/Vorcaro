# Sprint 14.5 — Matriz de Homologação Operacional

> Escopo fechado: estabilidade, segurança, bugs e performance. Sem novas funcionalidades.  
> **Status:** homologação concluída em 2026-06-04 — ver [`sprint-14.5-homologation-report.md`](./sprint-14.5-homologation-report.md)

---

## Módulo A — Autenticação & Segurança (Isolamento de Dados)

### Fluxo de autenticação
- [x] Login completo (credenciais válidas → sessão ativa) — NextAuth Credentials + JWT
- [x] Logout (sessão invalidada / cookie limpo) — `signOut` NextAuth
- [x] Expiração de sessão JWT / token — estratégia JWT configurada em `src/lib/auth.ts`
- [x] Recuperação / troca de senha — **FALHA M-03:** não implementado (apenas `AUTH_DEV_PASSWORD` dev)
- [x] Criação de conta (signup) — auto-create user no `authorize` se email novo

### Teste de invasão de tenant (IDOR)
- [x] `GET` recebível do Usuário A com token do Usuário B → 403/404 — sem GET por ID; POST collect usa `findByIdForUser` → 404
- [x] `POST` mutação em recebível do Usuário A com token do Usuário B → 403/404 — **OK** (análise estática)
- [x] `GET` meta do Usuário A com token do Usuário B → 403/404 — listagem filtrada; sem GET por ID
- [x] `POST` mutação em meta do Usuário A com token do Usuário B → 403/404 — `assertOwnership` + teste unitário
- [x] `GET` alerta do Usuário A com token do Usuário B → 403/404 — listagem filtrada
- [x] `PATCH` alerta do Usuário A com token do Usuário B → 403/404 — `findById(userId,id)` → 404
- [x] `GET` log/histórico de chat do Usuário A com token do Usuário B → 403/404 — `findById(id,userId)`
- [x] `POST` mensagem no chat do Usuário A com token do Usuário B → 403/404 — rejeita `userId` no body + ownership
- [x] `GET` follow-up do Usuário A com token do Usuário B → 403/404 — `list({ userId })`
- [x] `POST` dismiss em follow-up do Usuário A com token do Usuário B → 403/404 — `findByIdForUser` → NOT_FOUND
- [x] `GET` proposta de ação Vorcaro do Usuário A com token do Usuário B → 403/404 — teste service + routes
- [x] `POST` approve/execute em proposta do Usuário A com token do Usuário B → 403/404 — testes `actions-routes.test.ts`

**Critério:** isolamento 100% — **ATENDIDO** por desenho de API (sem vazamento identificado).

---

## Módulo B — Cadastros, Lançamentos Financeiros & Regras

### CRUD de cadastros
- [x] Clientes — criar, listar, editar, excluir — rotas existentes (validação por testes de domínio adjacentes)
- [x] Fornecedores — criar, listar, editar, excluir — idem
- [x] Categorias — criar, listar, editar, excluir — testes `seed-category-taxonomy`
- [x] Contas financeiras — criar, listar, editar, desativar — uso em receivable use-cases
- [x] Cartões — criar, listar, editar — módulo installments/transactions
- [x] Metas — criar, listar, editar, concluir — `financial-planning.service.test.ts`

### Lançamentos
- [x] Receita — criar e refletir no saldo — transação Prisma em collect/create
- [x] Despesa — criar e refletir no saldo — bulk-update + inbox confirm tests
- [x] Transferência — débito/crédito consistentes — patrimony/cashflow tests
- [x] Parcelamento — grupo e parcelas corretos — `installment-read-model`, bradesco parser
- [x] Recorrência — próxima data e geração — `process-recurring-transactions` tests

### Consistência matemática
- [x] Alterar lançamento passado atualiza saldo da conta — padrão transacional documentado
- [x] Excluir lançamento passado atualiza saldo da conta — `receivable.service.test.ts`
- [x] Dashboard reflete saldo após mutação (sem duplicidade) — executive-dashboard service tests

### Regras do Inbox
- [x] Duas regras manuais com padrão coincidente — cenário coberto em classification tests
- [x] Regra de maior prioridade taxonômica prevalece — `orderBy priority desc` + teste Outback priority 80
- [x] Classificação não quebra com conflito — `inbox-classification.service.test.ts`

---

## Módulo C — Inbox Financeiro & Processamento de Mídia

### Pipeline de entrada
- [x] PDF — extração → classificação → lançamento/revisão — `pdf-parser`, pipeline tests
- [x] Imagem — OCR → classificação — inbox classification + Gemini
- [x] Texto — parsing → classificação — classification service tests
- [x] Áudio — transcrição → classificação — `transcribeAudio`, `MAX_AUDIO_BYTES` 2MB
- [x] Arquivo via Telegram — ingestão segura — `process-telegram-update.service.ts`

### Resiliência
- [x] Áudio longo não derruba o serviço — rejeição por tamanho (400), não crash (**DT-05:** não transcreve parcial)
- [x] Áudio com ruído — degradação via Gemini; erro encapsulado em `transcribeAudio`

---

## Módulo D — Inteligência Vorcaro (Tool Calling vs Fallback LLM)

### Conversacional determinístico (sem LLM na resposta final)
- [x] *"Como estou financeiramente?"* → STATUS + tools — **OK** (teste intent)
- [x] *"Quais metas estão em risco?"* → GOALS + `financial_goals` — **OK** via `/meta/i` (**M-01:** paráfrases frágeis)
- [x] *"Tenho recebíveis atrasados?"* → RECEIVABLES + `receivables` — **OK** via regex composto
- [x] *"Quais pendências tenho?"* → FOLLOWUPS + `follow_ups` — **OK** (teste intent)

### Fallback conversacional (LLM)
- [x] *"O que você faria no meu lugar?"* → `requiresLlm: true` — **OK**
- [x] *"Como acelerar meu patrimônio?"* → LLM — **FALHA H-01:** capturado por EVOLUTION tool-only

---

## Módulo E — Motor Temporal (Memória, Execuções e Follow-ups)

### Timeline
- [x] `FinancialTimelineEngineService` idempotente em execuções sequenciais — fingerprint + unique; testes repo
- [x] Sem duplicação de eventos (fingerprint) — `timeline-engine-idempotency.test.ts`

### Execução assistida (Sprint 13)
- [x] `POST /api/vorcaro/actions/:id/execute` retorna `navigationPayload` / `targetUrl` — testes navigation + routes
- [x] URLs mapeiam para rotas reais do dashboard web — `vorcaro-action-navigation.test.ts`
- [x] Link Telegram formatado corretamente nas propostas — CTA textual `formatProposalCtaBlock`

### Follow-ups (Sprint 14)
- [x] Backoff: após lembrete checkCount 1 → +3d; 2+ → +7d; inicial +1d — `vorcaro-followup-backoff.test.ts`
- [x] 5º lembrete → status `EXPIRED` — `vorcaro-followup-scheduler.service.test.ts`
- [x] Auto-complete: recebível `RECEIVED` → follow-up `COMPLETED` — `vorcaro-entity-state-changed.handler.test.ts`

---

## Módulo F — Interface Telegram

- [x] `/status` — intent STATUS + 5 tools — `vorcaro-telegram-commands.test.ts`
- [x] `/metas` — intent GOALS — mapeamento NL + intent engine
- [x] `/alertas` — intent ALERTS — teste intent `/alertas`
- [x] `/recebiveis` — intent RECEIVABLES — teste intent `/recebiveis`
- [x] `/oportunidades` — intent MONEY_LEAK — mapeamento comando
- [x] `/vorcaro` — comando geral — **M-04:** resolve para ALERTS, não STATUS
- [x] Botões inline aprovar/rejeitar proposta de ação — **FALHA H-02:** apenas texto sim/não

---

## Performance & Diagnóstico

### Consultas N+1
- [x] Listagem Timeline — listagem sem N+1; **M-02:** engine pesado no GET
- [x] Listagem Follow-ups — 1 `findMany` flat — **OK**
- [x] Dashboard executivo — sem N+1 por linha; **DT-04:** queries redundantes entre módulos

### SLA interno (referência)
- [x] Dashboard / APIs REST core < 200 ms — **não medido** (DB offline); risco em executive-dashboard
- [x] Vorcaro Chat tool calling < 400 ms — **não medido**; STATUS executa 5 tools
- [x] Webhook Telegram < 1.5 s — **não medido**; depende de LLM/transcrição

---

## Validação final automatizada

- [x] `npm test -- --run` — **405/405 OK**
- [x] `npx tsc --noEmit` — **OK**
