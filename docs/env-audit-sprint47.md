# Auditoria `.env` — Sprint 4.7 (Telegram)

**Data:** 2026-06-02  
**Regras:** nenhum token real registrado neste documento.

## Presença de variáveis

| Variável | Status | Observação |
|----------|--------|------------|
| `NODE_ENV` | Definida | `development` |
| `NEXT_PUBLIC_APP_URL` | Definida | `http://localhost:3000` |
| `DATABASE_URL` | Definida | Postgres porta **5433** (docker-compose) |
| `REDIS_URL` | Definida | Redis porta **6380** |
| `AUTH_SECRET` | Definida | Placeholder genérico — considerar rotacionar em prod |
| `AUTH_URL` | Definida | Alinhada ao app local |
| `AUTH_DEV_PASSWORD` | Definida | Apenas dev |
| `GEMINI_API_KEY` | Definida | Motor IA ativo |
| `GEMINI_MODEL` | Definida | `gemini-2.5-flash` |
| `GROQ_API_KEY` | Definida | Motor alternativo |
| `GROQ_MODEL` | Definida | `llama-3.3-70b-versatile` |
| `TELEGRAM_BOT_TOKEN` | Definida | Usado pelo adapter |
| `TELEGRAM_WEBHOOK_SECRET` | **Configurado nesta sprint** | 64 caracteres hex; header `X-Telegram-Bot-Api-Secret-Token` |

## `.gitignore`

- `.env` e `.env*.local` — **ignorados** (OK).

## `.env.example`

Atualizado com placeholders, portas 5433/6380, `TELEGRAM_WEBHOOK_SECRET`, `GROQ_*` e instruções ngrok/setWebhook.

## Ações realizadas

- `TELEGRAM_WEBHOOK_SECRET` descomentado e preenchido (gerado via `crypto.randomBytes(32).hex`).
- Demais variáveis **não alteradas**.
