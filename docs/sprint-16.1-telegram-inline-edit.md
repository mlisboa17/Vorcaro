# Sprint 16.1 — Edição inline de categoria, local e valor no Telegram

> Parte do Sprint 16 (ver `roadmap-sprint-16-plus.md`).
> Objetivo: após o bot detectar um lançamento, o usuário edita **categoria**, **local**
> (estabelecimento) e **valor** direto no chat, por botões — sem sair pro dashboard.

## O que já existe (auditado)

- **Mensagem de detecção**: `process-financial-inbox-item.ts` monta o card
  "📝 Lançamento Detectado" (local=`extraction.description`, valor=`extraction.amount`,
  data, tipo) + teclado `buildCognitiveTransactionKeyboard(inboxItemId)`.
- **Teclado cognitivo**: hoje só `✅ Confirmar` / `❌ Descartar`
  (`telegram-inline-actions.ts`).
- **Router de callback**: `process-telegram-update.service.ts::executeCallback` já
  trata `cog_ack:`, `cog_rej:`, `doc_*`, `stmt_acc:`, etc.
- **Estado conversacional curto**: padrão Redis já usado —
  `telegram:password_pending:<chatId>` com `setex` (TTL 300s).
- **Persistência da extração**: `PrismaExtractionResultRepository`
  (`findLatestByInboxItemId`, `updateExtractedData`) — fonte da verdade do lançamento
  pendente. Confirmar (`handleInboxBulkConfirm`) cria a Transaction a partir dela.
- **Edição de categoria por botão**: já existe para documentos (`doc_alter` →
  `buildCategoryOptionsKeyboard` → `doc_cat`). Serve de molde.

## Delta a construir

1. **Teclado cognitivo com 3 ações de edição** (linha extra):
   `✏️ Categoria` · `📍 Local` · `💰 Valor` — abaixo de `✅ Confirmar` / `❌ Descartar`.
2. **Categoria**: reusa o fluxo de opções da IA (as 3 sugestões já ficam no
   `ExtractionResult`/metadata). Botão → lista 3 → aplica em `extractedData.categoryId`.
3. **Local e Valor**: exigem 1 passo de texto do usuário →
   - grava `telegram:edit_pending:<chatId>` = `{ inboxItemId, field: "local"|"valor" }` (TTL 120s);
   - próxima mensagem de texto do usuário é interceptada, valida e grava em
     `extractedData.description` (local) ou `extractedData.amount` (valor);
   - re-renderiza o card atualizado com o mesmo teclado.
4. **Confirmar** passa a criar a Transaction a partir da extração (possivelmente
   editada) — alinhar `cog_ack` com `handleInboxBulkConfirm` se hoje só marca SAVED.

## Fluxo no Telegram (economia de tokens)

```
Bot: 📝 Mercado Extra · R$ 50,00 · Alimentação
     [✅ Confirmar] [❌ Descartar]
     [✏️ Categoria] [📍 Local] [💰 Valor]

User toca 💰 Valor
Bot: (answerCallbackQuery, sem msg nova) "Novo valor?"  ← 1 linha
User: 75
Bot: 📝 Mercado Extra · R$ 75,00 · Alimentação
     [✅ Confirmar] [❌ Descartar] [✏️ Categoria] [📍 Local] [💰 Valor]

User toca ✅ Confirmar
Bot: ✅ Salvo! 👍                                       ← 1 linha
```

Regras de token:
- Card sempre em **1 mensagem editada** (`editMessageText`), não novas mensagens.
- Pedido de dado = **1 linha curta** ("Novo valor?", "Qual o local?").
- Confirmações = **1 linha** com emoji ("✅ Salvo! 👍", "📍 Local atualizado.").
- Nenhum texto explicativo longo — o botão é a interface.

## Loop incremental (sub-passos de 16.1)

- **16.1.1** — Teclado: adicionar linha `Categoria/Local/Valor` +
  `parseCognitiveEditCallback`. Sem lógica ainda (botões respondem "em breve").
  _Entrega testável: botões aparecem._
- **16.1.2** — Editar **valor**: Redis pending + intercept de texto + validação
  (`parseBrazilianAmount`) + `updateExtractedData` + re-render card.
- **16.1.3** — Editar **local**: mesmo fluxo, campo `description`.
- **16.1.4** — Editar **categoria**: reusar opções da IA (as 3 do
  `ExtractionResult`), aplicar `categoryId`, re-render.
- **16.1.5** — Confirmar cria Transaction da extração editada (alinhar `cog_ack`).
- **16.1.6** — Testes (unit dos parsers de callback + fluxo) e humanização das
  respostas curtas.

Cada sub-passo: build + typecheck + teste + deploy incremental.

## Arquitetura (arquivos tocados)

- `src/lib/telegram/telegram-inline-actions.ts` — novo teclado + parser
  `parseCognitiveEditCallback` (`cog_edit:<field>:<inboxItemId>`).
- `src/modules/telegram/application/process-telegram-update.service.ts` —
  handlers no `executeCallback` + intercept de texto quando há `edit_pending`.
- `src/lib/queue/process-financial-inbox-item.ts` — extrair a montagem do card
  para função reusável `renderCognitiveCard(inboxItemId)` (usada no 1º envio e nos re-renders).
- `PrismaExtractionResultRepository` — já tem `updateExtractedData`; sem mudança.

## Fora de escopo (fica no 16.2+)

- Detecção de receita por verbos (16.2).
- Edição pós-confirmação de Transaction já salva (usa `/api/transactions/[id]`) —
  só se o usuário pedir; o foco de 16.1 é editar **antes** de confirmar.
