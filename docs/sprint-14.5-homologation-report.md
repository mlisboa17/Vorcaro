# Sprint 14.5 — Relatório de Homologação Operacional

**Data:** 2026-06-04  
**Escopo:** estabilidade, segurança, bugs e performance — sem novas funcionalidades  
**Método:** auditoria estática de código, testes automatizados (405 casos), revisão de rotas API e fluxos Vorcaro/Telegram  
**Ambiente:** homologação sem banco Postgres ativo para testes E2E manuais; itens de UI/SLA marcados como *análise de código + testes unitários*

---

## Resumo executivo

| Severidade | Quantidade |
|------------|------------|
| BUG CRÍTICO | 0 |
| BUG ALTO | 2 |
| BUG MÉDIO | 4 |
| BUG BAIXO | 2 |
| MELHORIA UX | 3 |
| DÍVIDA TÉCNICA | 5 |

**Regressão automatizada:** `npm test -- --run` → **405/405 OK** · `npx tsc --noEmit` → **OK**

**Veredito geral:** multitenancy nas APIs auditadas está **correto por desenho**; gaps principais são **roteamento LLM incorreto** em pergunta estratégica, **ausência de botões inline no Telegram**, **performance da timeline no GET** e **cobertura de testes IDOR incompleta**.

---

## Inconformidades

### BUG ALTO

#### H-01 — Fallback LLM não acionado para pergunta estratégica de patrimônio
- **Módulo:** D (Vorcaro Intent)
- **Cenário:** *"Como acelerar meu patrimônio?"* (checklist exige LLM)
- **Comportamento atual:** `MEMORY_INTENT_RULES` captura `/meu patrim[oô]nio/i` antes das regras LLM → intent `EVOLUTION`, `requiresLlm: false` → tool `financial_evolution` (resposta determinística)
- **Evidência:** `src/modules/vorcaro/intent/application/services/vorcaro-intent-engine.service.ts` (L9–21 vs L34–37, L116–124)
- **Impacto:** resposta estratégica substituída por dados de evolução; viola critério Módulo D
- **Sugestão (próxima sprint):** padrão LLM com `acelerar` + `patrimônio` avaliado antes de `MEMORY_INTENT_RULES`, ou restringir regex de patrimônio

#### H-02 — Botões inline de aprovação/rejeição ausentes no Telegram
- **Módulo:** F (Telegram)
- **Cenário:** checklist exige interação com botões inline em propostas de ação
- **Comportamento atual:** confirmação apenas por texto (`sim`/`não`); `sendTelegramMessage` sem `reply_markup`; webhook processa só `message`, sem `callback_query`
- **Evidência:** busca por `reply_markup`/`inline_keyboard`/`callback_query` → zero ocorrências em `src/`
- **Impacto:** fluxo funcional via texto, mas critério de homologação Módulo F não atendido
- **Sugestão:** implementar `InlineKeyboard` + handler `callback_query` (fora do escopo 14.5)

---

### BUG MÉDIO

#### M-01 — Intent frágil para “metas em risco” e “recebíveis atrasados”
- **Módulo:** D
- **Detalhe:** frases exatas do checklist funcionam via `/meta/i` e `/receb[ií]v|atrasad/i`, mas paráfrases sem essas substrings caem em `GENERAL_CHAT` → LLM
- **Exemplos:** *"Quais objetivos estão em risco?"*, *"O que está atrasado para eu receber?"*
- **Evidência:** `vorcaro-intent-engine.service.ts` — sem padrões dedicados `em risco` / `recebíveis atrasados`
- **Impacto:** inconsistência conversacional; não bloqueia frases canônicas do checklist

#### M-02 — `GET /api/vorcaro/timeline` executa engine completo a cada requisição
- **Módulo:** E / Performance
- **Detalhe:** `runForUser` antes de listar eventos — idempotente, porém dezenas de queries por request
- **Evidência:** `src/app/api/vorcaro/timeline/route.ts` L19
- **Impacto:** provável violação SLA <200 ms em contas com histórico; UX lenta no dashboard de memória

#### M-03 — Recuperação/troca de senha não implementada
- **Módulo:** A
- **Detalhe:** auth via NextAuth Credentials + `AUTH_DEV_PASSWORD` opcional; sem fluxo forgot/reset password
- **Evidência:** `src/lib/auth.ts` — apenas `authorize` com email + dev password
- **Impacto:** checklist de auth incompleto para produção; aceitável em ambiente dev

#### M-04 — Comando `/vorcaro` mapeia para ALERTS, não bundle STATUS
- **Módulo:** F
- **Detalhe:** `resolveVorcaroTelegramQuestion` traduz `/vorcaro` → *"O que preciso resolver hoje?"* → intent `ALERTS`
- **Evidência:** `src/lib/telegram/vorcaro-telegram-commands.ts`
- **Impacto:** comportamento diferente do esperado para “assistente geral”; não é erro de segurança

---

### BUG BAIXO

#### B-01 — Descrição incorreta em teste de backoff
- **Arquivo:** `src/modules/vorcaro/followups/__tests__/vorcaro-followup-backoff.test.ts` L9 — texto do `it()` não corresponde ao assert (+3 dias)
- **Impacto:** apenas confusão em manutenção

#### B-02 — Respostas IDOR retornam 404 em vez de 403 de forma inconsistente
- **Módulo:** A
- **Detalhe:** PATCH alerta / proposta Vorcaro de outro tenant → `404 Not Found` (aceitável pelo checklist, mas inconsistente entre rotas)
- **Impacto:** estético/semântico

---

### MELHORIA UX

#### UX-01 — Adicionar padrões explícitos no Intent Engine
- `/metas?\s+em\s+risco/i`, `/receb[ií]v.*atrasad/i` para reduzir fallthrough ao LLM

#### UX-02 — Separar refresh da timeline (cron) da listagem (GET leve)
- UI poderia consumir apenas `listTimelineEvents` após cron noturno

#### UX-03 — Dashboard executivo: cache ou deduplicar `getGoals` + `consultant.consult` já carregados no core

---

### DÍVIDA TÉCNICA

#### DT-01 — Cobertura de testes IDOR incompleta
- Rotas HTTP de receivables, alerts, follow-ups, chat **sem** testes cross-tenant automatizados (exceto Vorcaro actions parcialmente)
- `findById(id)` sem `userId` em `PrismaVorcaroActionProposalRepository` — não exposto via API, mas defense-in-depth fraco

#### DT-02 — `update({ where: { id } })` após check de ownership (padrão global)
- Recebíveis, metas, alertas, propostas — risco residual se checagem for removida no futuro

#### DT-03 — Timeline `upsertTimelineEvent` sem tratamento de `P2002` em race concorrente
- Unique constraint protege, mas insert concorrente pode lançar erro não tratado

#### DT-04 — Executive dashboard: queries redundantes entre `ExecutiveDashboardService` e `getExecutivePlanningSnapshot`
- `FinancialComparisonService.compareAll` repete `getHistoryDaysAvailable` 4×

#### DT-05 — Áudio limitado a 2 MB (`MAX_AUDIO_BYTES`) sem degradação documentada para áudios longos
- Rejeição por tamanho (não derruba serviço), mas checklist pede validação de áudio longo — comportamento é **rejeitar**, não transcrever parcialmente

---

## Resultados por módulo (síntese)

### Módulo A — Autenticação & Segurança
- **Login/Logout/Sessão JWT:** implementado (NextAuth Credentials + JWT)
- **Recuperação/troca de senha:** **não implementado** (M-03)
- **IDOR:** APIs auditadas filtram por `session.user.id` → **isolamento OK** (análise estática)
- **Testes automatizados IDOR:** parcial (metas service, actions routes, receivable from-transaction)

### Módulo B — Cadastros & Lançamentos
- **CRUD/lançamentos:** cobertos por testes unitários de domínio (receivables, recurring, cashflow, planning, transactions bulk)
- **Consistência de saldo:** `CollectReceivableUseCase` atualiza conta na mesma transação Prisma; testes de receivable.service cobrem aplicação de valores
- **Conflito de regras:** `orderBy: [{ priority: "desc" }]` + teste Outback (regra user priority 80 vence padrão)

### Módulo C — Inbox & Mídia
- **PDF:** testes `pdf-parser`, `bradesco-invoice-parser`, pipeline installment
- **Classificação:** testes extensivos `inbox-classification.service.test.ts`
- **Áudio:** limite 2 MB + transcrição Gemini; Telegram voice → `transcribeAudio`; áudio > limite → erro controlado (não 500 genérico)

### Módulo D — Vorcaro
- **Tool-only (4 frases canônicas):** 3 OK direto; *"Como acelerar patrimônio?"* classificado errado no checklist de fallback (inverso: deveria LLM, vai tool)
- **Fallback LLM:** *"O que você faria no meu lugar?"* OK (`requiresLlm: true`)

### Módulo E — Motor Temporal
- **Timeline idempotência:** fingerprint + `@@unique`; testes repo OK; sem teste integração `runForUser` 2×
- **Execução assistida:** `vorcaro-action-navigation.test.ts` valida URLs `/dashboard/...`
- **Follow-ups backoff/expiração/auto-complete:** testes unitários **conforme spec**

### Módulo F — Telegram
- **Comandos slash:** roteamento para `VorcaroConversationService` + intent engine OK (testes parciais)
- **Botões inline:** **ausentes** (H-02)

### Performance
- **N+1 listagem follow-ups:** não identificado
- **N+1 timeline list:** não; **engine no GET** é gargalo (M-02)
- **SLA:** não medido em runtime (DB indisponível); análise indica risco em timeline GET e executive dashboard

---

## Ações recomendadas (pós-14.5)

1. Corrigir H-01 (prioridade) antes de homologação conversacional em produção
2. Decidir se H-02 (inline buttons) entra em sprint dedicada Telegram
3. Adicionar suite de testes IDOR HTTP (receivables, alerts, followups, chat)
4. Desacoplar `runForUser` do GET timeline
5. Homologação manual E2E com Postgres quando ambiente estiver disponível (`npx prisma migrate deploy`)

---

## Referências

- Checklist: [`docs/sprint-14.5-homologation-checklist.md`](./sprint-14.5-homologation-checklist.md)
- Sprint 14 follow-ups: [`docs/sprint-14-followups.md`](./sprint-14-followups.md)
