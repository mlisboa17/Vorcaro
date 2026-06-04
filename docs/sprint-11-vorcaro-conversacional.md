# Sprint 11 — Vorcaro Conversacional

## Objetivo

Transformar o Vorcaro em consultor financeiro conversacional no LOGOS e Telegram, usando exclusivamente dados reais do sistema.

## Arquitetura

```
Usuário → Vorcaro Chat Engine → Context Aggregator → Prompt Builder → LLM + Personalidade 10.5
                ↓
         VorcaroConversation / VorcaroMessage (PostgreSQL)
```

## Componentes

| Serviço | Responsabilidade |
|---------|------------------|
| `VorcaroConversationService` | Orquestra chat, persistência, LLM |
| `VorcaroContextAggregatorService` | Contexto financeiro unificado + cache 60s |
| `VorcaroConversationMemoryService` | Histórico, tópico ativo, continuidade |
| `VorcaroPromptBuilderService` | Montagem e compressão de prompt |
| `FinancialHealthConversationService` | Respostas diretas de saúde financeira |
| `VorcaroChatGuardrailService` | Anti-alucinação, dados insuficientes |

## APIs

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/vorcaro/chat` | Enviar mensagem |
| `GET/POST` | `/api/vorcaro/conversations` | Listar / criar conversas |
| `GET` | `/api/vorcaro/conversations/[id]` | Conversa + mensagens |
| `GET/PATCH` | `/api/vorcaro/preferences` | Tom Vorcaro |

## UI

- `/dashboard/vorcaro/chat` — chat persistente com tom configurável

## Telegram

Comandos: `/status`, `/alertas`, `/gastos`, `/metas`, `/oportunidades`, `/recebiveis`, `/vorcaro`

Perguntas livres: `Vorcaro, <pergunta>`

Comprovantes e mídia continuam no fluxo de inbox.

## Segurança

- Multitenancy via `session.user.id` / ownership em repositório
- Rate limit: 60 msg/h (WEB), 30 msg/h (Telegram)
- `userId` proibido no body das APIs

## Prisma

Migration: `20260605120000_vorcaro_conversational_sprint11`

- `VorcaroConversation`
- `VorcaroMessage`

## Fora de escopo

WhatsApp, pagamentos, execução automática de ações, integrações bancárias novas.
