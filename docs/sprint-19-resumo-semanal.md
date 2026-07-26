# Sprint 19 — Resumo semanal (automático + sob demanda)

## Auditoria

- **Cron route existe**: `/api/cron/notification-digest-weekly` (Bearer CRON_SECRET),
  mas **não está agendado** — não há `vercel.json` com `crons`. Gap.
- Falta uma **agregação semanal** de totais (despesas, receitas, saldo líquido,
  top categorias) — não achei serviço pronto para isso.
- `/status` e o digest de alertas já existem (reuso parcial).

## 19.1 — Agregação de resumo (serviço puro + query)

- `WeeklySummaryService.build(userId, sinceDays)`:
  - soma `Transaction` no período por `type` (EXPENSE/INCOME) → totais + saldo líquido;
  - top 3 categorias por gasto;
  - contagem de alertas abertos (reusa `FinancialAlertQueryService`).
- Formatter Telegram curto (1–2 linhas por bloco) + botões inline
  (`sum_details`, `sum_categorize`, `sum_export`).
- Testes puros: formatação com dados; período vazio → "sem movimentações".

## 19.2 — Sob demanda no Telegram

- Comando `/resumo` (padrão 7 dias) e `/resumo 30` (X dias).
- Parser de período: `parseSummaryDays(text)` → nº dias (default 7, limite 90).
- Chama `WeeklySummaryService.build` e envia. Redis `telegram:summary:<chatId>`
  TTL curto para não repetir em sequência.

## 19.3 — Automático (domingo à noite)

- Adicionar `vercel.json` com cron domingo 21:00 (`0 0 * * 1` UTC ≈ dom 21h BRT)
  apontando para uma rota que, por usuário conectado ao Telegram, monta o resumo
  e envia. Reusa o padrão de `notification-digest-weekly` + entrega Telegram.
- Idempotência: fingerprint semanal (não reenviar o mesmo resumo se o cron
  disparar 2x).

## 19.4 — Botões + E2E

- `sum_details` → deep-link `/dashboard/insights`; `sum_categorize` → reusa fluxo
  de pendências (18.1); `sum_export` → depende do Sprint 21 (CSV/relatório).
- E2E: automático (cron monta e envia), sob demanda período válido, vazio,
  botões, anti-repetição por TTL.

## Decisão

- Agendamento do cron: adicionar `vercel.json` `crons` (recomendado) — simples,
  versionado. Alternativa: cron pelo painel Vercel (não versionado).
