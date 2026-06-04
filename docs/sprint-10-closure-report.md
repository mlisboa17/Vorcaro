# Sprint 10 — Central de Notificações Inteligentes (Fechamento)

## Objetivo

Transformar o LOGOS de detector passivo em comunicador proativo via **Notification Center** reutilizável por Dashboard, Telegram, digest e futuros canais.

## Entregas

### Domínio e persistência

- Modelos Prisma `Notification` e `NotificationPreference`
- Migration `20260604120000_notification_center_sprint10`
- Enums: `NotificationType`, `NotificationSeverity`, `NotificationStatus`, `NotificationChannel`
- Deduplicação via `fingerprint` + `@@unique([userId, fingerprint])`

### Serviços

- `NotificationCenterService` — publicar, deduplicar, entregar por canal
- `NotificationQueryService` — listagem e resumo
- `NotificationDigestService` — digest diário (08:00) e semanal (segunda 08:00)
- `NotificationTelegramDeliveryService` — envio real MarkdownV2 + rate limit 3/h
- `NotificationEventBridgeService` — ponte para alertas, advisor, detectores

### Preferências

- Defaults: Dashboard ON, Telegram OFF, Digest ON (todos os tipos)
- API `GET/PATCH /api/notifications/preferences`

### Dashboard

- `/dashboard/notifications` — abas Não lidas / Lidas / Descartadas + filtros
- Badge no menu lateral (`/api/notifications/summary`)

### Telegram

- `sendTelegramMessageWithMode` (HTML | MarkdownV2)
- Envio imediato para: recebível atrasado, fluxo negativo, meta em risco, comprometimento elevado
- Rate limit: máximo 3 notificações Telegram por usuário por hora

### Cron / CLI

- `POST /api/cron/notification-digest-daily` — digest diário
- `POST /api/cron/notification-digest-weekly` — digest semanal
- `npm run notifications:digest-daily` / `notifications:digest-weekly`

### Integração

- `FinancialAlertEngineService` publica notificação ao criar alerta novo

## APIs

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/notifications` | Lista com filtros |
| GET | `/api/notifications/summary` | Contador não lidas |
| PATCH | `/api/notifications/[id]` | Marcar lida / descartar |
| GET/PATCH | `/api/notifications/preferences` | Preferências |
| POST | `/api/cron/notification-digest-daily` | Cron digest diário |
| POST | `/api/cron/notification-digest-weekly` | Cron digest semanal |

## Validação

- `npm test -- --run` — 307 testes
- `npx tsc --noEmit` — OK
- `npx prisma validate` — OK

## Pendências (fora de escopo)

- Integração direta com Money Leak / Subscription Detector na publicação automática (bridge pronta)
- Canal e-mail
- Fila BullMQ dedicada para entrega assíncrona

## Tag

`sprint-10-stable`
