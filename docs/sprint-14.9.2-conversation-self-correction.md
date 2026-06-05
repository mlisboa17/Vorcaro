# Sprint 14.9.2 — Auto-Correção Conversacional do Vorcaro

## Objetivo

Camada de autoconsciência conversacional: validar respostas antes do envio, manter contexto, bloquear ferramentas incorretas e humanizar saídas robóticas — **sem alterar regras de negócio, Prisma ou algoritmos de auditoria**.

## Componentes

| Componente | Responsabilidade |
|------------|------------------|
| `VorcaroConversationContextService` | `currentTopic`, `lastIntent`, topic lock, stage |
| `VorcaroResponseCriticService` | Relevância, contexto, ferramenta, score |
| `VorcaroHumanizationGuard` | Remove FATO/IMPACTO/AÇÃO, enums, confiança % |
| `VorcaroConversationSelfCorrectionService` | Pipeline: detect → tool → critic → regenerate |
| `CategoryListTool` / `CardListTool` | Listagens simples (sem análise) |

## Topic Lock

Tópicos novos: `categories`, `cards`.

Frases de continuação mantêm o assunto: *"pode melhorar esse cadastro"*, *"vale a pena?"*, *"o que você faria?"*.

## Intents novos

- `CATEGORY_LIST` → `category_list` — *"Mostre minhas categorias"*
- `CARD_LIST` → `card_list` — *"Quais cartões tenho?"*

## Auto-regeneração

Se `critic.score < 0.7`, reexecuta com `lockedIntent` sugerido (ex.: `CATEGORY_AUDIT` em vez de `CASHFLOW`).

## Observabilidade

Métricas em `VorcaroIntentObservabilityService`:

- `responses_approved` / `responses_rejected`
- `wrong_tool_detected`
- `context_switch_blocked`
- `humanization_applied`
- `responses_regenerated`

## Debug (admin)

- UI: `/dashboard/vorcaro/debug`
- API: `GET /api/vorcaro/debug/diagnostics`
- Admin: `VORCARO_ADMIN_EMAILS` ou padrão `dev@logos.local`

## Validação

```bash
npm test -- --run
npx tsc --noEmit
npx prisma validate
```

## Critérios de aceitação

- [x] Mantém contexto de categorias em follow-ups
- [x] Bloqueia respostas de fluxo de caixa fora de contexto
- [x] Humaniza respostas robóticas
- [x] Lista categorias sem análise profunda
- [x] Auto-regeneração com intent corrigido
- [x] Dashboard de diagnóstico para admin
