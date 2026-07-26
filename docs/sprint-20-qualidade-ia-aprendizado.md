# Sprint 20 — Qualidade da IA (loop de aprendizado)

## Auditoria (boa notícia: infra existe)

- `InboxLearningService` já grava padrões em `UserLearningPattern`:
  `categorization_preference` e `classification_correction`.
- `handleInboxSmartBatchExecute(recordFeedback: true)` já registra aprendizado ao
  **confirmar** um lançamento (compara categoria sugerida vs escolhida).
- `InboxClassificationService.matchHistory` já **lê** esses padrões e dá alta
  confiança quando o mesmo estabelecimento reaparece.

## Delta real (o que falta)

As **edições inline do Sprint 16** (botões Alterar categoria / editar local/valor)
**NÃO geram sinal de aprendizado**. Quando o usuário corrige a categoria de um
lançamento pelo Telegram, esse é o sinal mais forte possível — e hoje é descartado.

## 20.1 — Capturar correção de categoria inline

- No handler de `cog_cat` (seleção de categoria) e no `select_category` de
  documentos: após aplicar, chamar `InboxLearningService.recordCorrection`
  (keyword = estabelecimento/descrição; categoria escolhida) como
  `classification_correction`.
- Idempotência: não duplicar padrão se a keyword+categoria já existir (o serviço
  já faz upsert por ocorrências — confirmar).
- Regressão zero: lançamento sem edição segue pelo caminho normal (feedback de
  confirmação já existente), sem novo efeito colateral.

## 20.2 — (opcional) sinal de valor/local

- Correção de local reforça a `descricaoBase`/merchant normalizado. Valor não é
  sinal de categoria — não alimentar aprendizado com valor (evita ruído).

## 20.3 — Testes

- `recordCorrection` chamado ao editar categoria inline (unit no handler via E2E).
- Regressão zero: confirmar sem editar não cria correção duplicada.
- Timeout/estado expirado: edição sem estado no Redis não chega a registrar nada
  (interceptor retorna null) — não polui aprendizado.
- Verificar que `matchHistory` passa a acertar de primeira após a correção
  (teste do classifier com um padrão de correção plantado).

## Escopo

Baixo risco, alto valor: fecha o loop reusando 100% da infra existente. Sem
migração de schema (`UserLearningPattern` já existe).
