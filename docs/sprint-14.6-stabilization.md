# Sprint 14.6 — Estabilização Pós-Homologação

Correções integrais dos achados da Sprint 14.5. **Sem novas funcionalidades de produto.**

## Bugs corrigidos

| ID | Correção |
|----|----------|
| **H-01** | Intent `STRATEGIC_ADVICE` com `requiresLlm: true` avaliado **antes** de `MEMORY_INTENT_RULES`; frases de patrimônio/estratégia não caem mais em `EVOLUTION` tool-only |
| **H-02** | Telegram: botões inline `[✅ Aprovar]` / `[❌ Rejeitar]` com `callback_data` `approve:<id>` / `reject:<id>`; webhook processa `callback_query`; dismiss de follow-up via `dismiss_fu:<id>` |
| **M-01** | Biblioteca `vorcaro-intent-synonyms.ts` — paráfrases para FOLLOWUPS, ALERTS, STATUS, RECEIVABLES, GOALS |
| **M-02** | Cache TTL **5 min** em `FinancialMemoryQueryService.refresh` e `FinancialEvolutionProfileService.compute`; `GET /api/vorcaro/timeline` não força engine a cada request sem cache |
| **M-03** | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`; modelo `PasswordResetToken`; `User.passwordHash` (scrypt) |
| **M-04** | `/vorcaro` exibe menu do assistente (`VORCARO_ASSISTANT_INTRO`), sem rotear para ALERTS |
| **B-01** | Textos de teste de backoff corrigidos; CTA Telegram sem menção confusa a sim/não |
| **B-02** | Ownership cross-tenant padronizado em **404** (Vorcaro actions `FORBIDDEN` → 404; installments) |

## Arquivos principais

- `src/modules/vorcaro/intent/domain/services/vorcaro-intent-synonyms.ts`
- `src/lib/telegram/telegram-inline-actions.ts`
- `src/lib/cache/ttl-memory-cache.ts`
- `src/modules/auth/application/services/password-reset.service.ts`
- `prisma/migrations/20260609120000_sprint_146_stabilization`

## Testes adicionados

- `vorcaro-intent-strategic.test.ts`
- `vorcaro-intent-synonyms.test.ts`
- `telegram-inline-actions.test.ts`
- `password-reset.service.test.ts`
- `financial-memory-cache.test.ts`
- `ttl-memory-cache.test.ts`

## Notas

- Reset de senha em dev retorna `devResetToken` na resposta de forgot (apenas `NODE_ENV !== production`).
- Login existente preservado; `AUTH_DEV_PASSWORD` continua válido para contas sem `passwordHash`.
- Confirmação textual `sim`/`não` no Telegram permanece como fallback legado.
