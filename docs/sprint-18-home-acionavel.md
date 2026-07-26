# Sprint 18 — Home acionável no Telegram

> Home curta que mostra "o que resolver agora", com mensagens de 1–2 linhas e
> botões inline. Reusa Redis + interceptores + humanização dos Sprints 16/17.

## 18.1 — Home com pendências (VIÁVEL AGORA)

Gatilho: `/home` (e `/start` pós-conexão de usuário já onboardado).

Pendências reais e queryáveis hoje:
- **Lançamentos a confirmar**: `financialInbox` com `status = NEEDS_CONFIRMATION`.
- **Alertas financeiros ativos**: módulo `financial-alerts` já existe e produz
  `UPCOMING_PAYMENT`, `OVERDUE_RECEIVABLE`, `CASHFLOW_WARNING`, `CREDIT_CARD_RISK`,
  `GOAL_AT_RISK`, etc. (há até `telegram-alert.formatter`).
- (Onboarding — conta/forma faltando — já é tratado no Sprint 17, não repete aqui.)

Fluxo Telegram (tokens mínimos):
```
/home
🏠 Você tem 3 pendências:
• 2 lançamentos a confirmar
• 1 conta a receber vencida
[📥 Confirmar lançamentos] [📊 Ver resumo]
```
Sem pendências:
```
🏠 Tudo em dia! ✅ Nada pendente por aqui.
[📊 Ver resumo]
```

Loop:
- **18.1.1** — helpers puros: `buildHomeSummary(counts)` (monta texto+teclado a partir
  de contagens) + parsers de callback (`home_confirm`, `home_summary`). Testes puros.
- **18.1.2** — gatilho `/home` no service: agrega contagens (inbox pendente +
  `FinancialAlertQueryService`) e envia a home. Redis `telegram:home:<chatId>` (TTL
  curto) para não reexibir em loop se o usuário mandar várias mensagens seguidas.
- **18.1.3** — botões: "Confirmar lançamentos" lista/roteia ao fluxo de confirmação
  existente; "Ver resumo" reusa `/status`. Testes.
- **18.1.4** — E2E: home com/sem pendências, botões, anti-loop (estado expira e não
  reaparece em sequência).

## 18.2 — "Saldo baixo": BLOQUEADO como especificado ⚠️

Auditoria revelou:
1. **`balance` NÃO é mantido** — nada no código incrementa o saldo ao criar/confirmar
   transação; o campo fica no valor inicial (≈0). Um alerta de "saldo < limite" seria
   **falso**.
2. **Não há campo de limite/threshold** por conta.
3. **Mas já existe** o engine `financial-alerts` gerando alertas úteis de dados reais.

Dois caminhos (decisão do dono):
- **(A) Recomendado** — Reenquadrar 18.2 como "surfaçar os alertas que o engine já
  produz" no Telegram (ex.: `CASHFLOW_WARNING`, `UPCOMING_PAYMENT`) com botões
  Ver/Ignorar. Entrega valor real, reusa `telegram-alert.formatter` + dedup por
  fingerprint. Sem migração.
- **(B) Maior** — Implementar manutenção de saldo real (incrementar/estornar em toda
  criação/edição/exclusão + reconciliação) e um campo `lowBalanceThreshold` por conta.
  É um projeto de correção à parte, com migração de schema. Só então "saldo baixo"
  faz sentido.

Até a decisão, 18.2 fica pausado; 18.1 segue independente.

## Decisão e entrega (18.2 = opção A)

Escolhida a opção A. Implementado:
- `/alertas` e o botão `home_alerts` chamam `renderAlerts` → `FinancialAlertQueryService.list(status OPEN)`
  → `TelegramAlertFormatter.formatDigest` (MarkdownV2) + botão "✅ Marcar como lidos".
- Callback `alerts_dismiss` → `bulkPatch(ids, "DISMISSED")`.
- Sem alertas → mensagem curta "Nenhum alerta". Sem migração; saldo real fica
  para um projeto futuro dedicado, se desejado.

**Sprint 18 fechado.** 13 casos E2E (onboarding + home + alertas).
