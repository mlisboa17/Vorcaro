# Sprint 16.3 — Voz: receita + edição inline (reuso do 16.1/16.2)

> Parte do Sprint 16. Objetivo: áudio de receita é classificado certo e o card
> de voz tem os mesmos botões/edição do card de texto.

## Auditoria (o que já existe)

- **Transcrição → lançamento**: `process-financial-inbox-item.ts` transcreve o
  áudio (`GeminiAiService.transcribeAudio`); se não parecer despesa, roteia pro
  assistente e apaga o item; se parecer, segue pro fluxo de extração.
- **Card de voz JÁ tem botões**: o render (linha ~178) roda para
  `item.channel.startsWith("TELEGRAM")` — inclui `TELEGRAM_VOICE`. Usa
  `formatCognitiveCardText` + `buildCognitiveTransactionKeyboard`.
- **Edição JÁ funciona em voz**: callbacks (`cog_edit`, `cog_cat`) e o
  interceptor (`handlePendingCognitiveEdit`) operam por `inboxItemId` sobre a
  `ExtractionResult` — não olham o canal. Logo, editar um card de voz já funciona.

## Delta real (o que falta)

**Único bug**: a detecção de receita (16.2) roda em `item.rawContent`, que para
voz é o placeholder `"[Audio Message]"` — **nunca** casa verbos de entrada. A
transcrição real existe no bloco de voz, mas é descartada antes da checagem.

## Loop incremental

- **16.3.1** — Income em voz: guardar a transcrição do bloco de voz numa variável
  de escopo da função e usá-la (fallback p/ `rawContent`) no `detectIncomeVerb`.
  Efeito: "recebi 500" falado vira RECEITA, card mostra "💚 Entrada detectada".
- **16.3.2** — Testes de integração cobrindo:
  - áudio de despesa → `type EXPENSE`, card com botões;
  - áudio de receita → `type INCOME` via transcrição;
  - edição inline (valor/local/categoria) idêntica ao texto (já coberto pelos
    testes de 16.1/16.2 — os parsers/interceptor são channel-agnostic; adicionar
    um teste explícito do detector sobre transcrição de receita).

## Arquitetura (arquivos tocados)

- `src/lib/queue/process-financial-inbox-item.ts` — capturar `voiceTranscription`
  e usar no override de receita. Sem novos módulos.
- Testes: reuso de `detect-income-hint.test.ts`; nada novo em teclado/interceptor
  (já validados no 16.1/16.2).

## Fora de escopo

- Re-transcrição dupla (o use case transcreve de novo internamente) — otimização
  futura; não afeta correção.
