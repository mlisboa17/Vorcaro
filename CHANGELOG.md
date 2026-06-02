# Changelog

## [Unreleased]

### Added — Sprint 4.7 (Telegram)

- Modelos `TelegramConnection` e `TelegramConnectCode` (vínculo multi-usuário).
- `POST /api/telegram/webhook` com validação `TELEGRAM_WEBHOOK_SECRET` (header `X-Telegram-Bot-Api-Secret-Token`).
- `GET|POST|DELETE /api/telegram/integration` — status, gerar código `/connect`, desvincular.
- Tela `/dashboard/settings/integrations` para vínculo e documentação ngrok/cloudflared.
- Ingestão Telegram (texto, voz, foto) na Caixa Financeira para chats vinculados.
- Testes: `connect-command`, `webhook-auth`, `generate-connect-code`.

### Changed

- Rota legada `/api/webhooks/telegram` delega para o novo webhook (compat. `?token=`).
- `.env.example` alinhado às portas Docker (5433/6380) e variáveis Telegram/Groq.

### Documentation

- `docs/migrations-legacy-inventory.md` (Sprint 4.6).
- README com seção Telegram ampliada.

## [0.1.0] — 2026-06-02

### Added

- Rebaseline Prisma (`init_clean_schema`) e arquivamento `migrations_archived_legacy`.
- Módulos: inbox, transações, recorrências, patrimônio, consórcios, fluxo de caixa, dashboard executivo.
