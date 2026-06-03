# Arquitetura de IA — Vorcaro Finance Control

O projeto usa **duas camadas de IA** com propósitos distintos:

| Camada | Módulo | Uso |
|--------|--------|-----|
| **Advisor multi-provider** | `src/modules/ai` + `financial-advisor` | Chat `/dashboard/advisor`, insights |
| **Inbox legado** | `financial-inbox` → `GeminiAiService` | Extração de texto/imagem/PDF na caixa |

Este documento foca na **Sprint 5 (Advisor)**.

---

## Providers

| Provider | Env | Papel |
|----------|-----|-------|
| **Groq** | `GROQ_API_KEY`, `GROQ_MODEL` | Primário (ex.: `llama-3.3-70b-versatile`) |
| **Gemini** | `GEMINI_API_KEY`, `GEMINI_MODEL` | Fallback |
| **OpenRouter** | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | Fallback (`openrouter/auto`) |

Implementações: `src/modules/ai/infrastructure/providers/`.

---

## Fallback (cadeia)

```
Groq
  ↓ (falha / não configurado)
Gemini
  ↓
OpenRouter
  ↓
AiRouterExhaustedError → mensagem controlada ao usuário
```

- Timeout por provedor: **10s** (configuração no router).
- Ordem definida em `createDefaultAiProviders()` e iterada em `AiRouterService.generateText()`.

---

## Port e contrato

### `AiProviderPort`

- `generateText(input)` — texto livre com `system` + `prompt`.
- `generateJson(input)` — JSON estruturado (usado onde aplicável).
- `isConfigured()` — verifica env antes de instanciar.

Erros encapsulados em `AiProviderError`; esgotamento em `AiRouterExhaustedError`.

---

## Serviços

### `AiRouterService`

**Responsabilidade:** Orquestrar provedores em cascata; não conhece domínio financeiro.

**Local:** `src/modules/ai/application/services/ai-router.service.ts`

### `FinancialAdvisorService`

**Responsabilidade:** `ask(userId, question)` — agrega contexto, calcula confiança, chama router.

**Regras:**

- Se `confidence === LOW` → retorna mensagem fixa sem chamar IA externa.
- Se resposta contém texto de dados insuficientes → normaliza para mensagem padrão.
- **Nunca** recebe `userId` do HTTP body.

**Local:** `src/modules/financial-advisor/application/services/financial-advisor.service.ts`

### `FinancialDataAggregatorService`

**Responsabilidade:** Montar markdown de contexto (contas, transações, patrimônio, fluxo, metas quando existirem) + `dataScore` + `usedSources`.

**Local:** `src/modules/financial-advisor/application/services/financial-data-aggregator.service.ts`

### `FinancialInsightsService`

**Responsabilidade:** Insights para `GET /api/advisor/insights` (regras + texto IA).

**Local:** `src/modules/financial-advisor/application/services/financial-insights.service.ts`

---

## Prompt do sistema (Advisor)

Definido em `src/modules/financial-advisor/domain/constants.ts` (`ADVISOR_SYSTEM_PROMPT`):

- Usar **apenas** dados do contexto markdown.
- Não inventar valores.
- Tom conversacional em português (Sprint 5+).
- Mensagem determinística se faltar contexto:

  > "Não encontrei dados suficientes para responder com segurança."

---

## APIs

| Método | Rota | Serviço |
|--------|------|---------|
| POST | `/api/advisor/ask` | `FinancialAdvisorService.ask` |
| GET | `/api/advisor/insights` | `FinancialInsightsService` |

---

## Confiança (`confidence`)

| Nível | Critério (simplificado) |
|-------|-------------------------|
| LOW | `dataScore < 3` ou sem fontes |
| MEDIUM | score intermediário ou poucas fontes |
| HIGH | score alto e ≥ 3 fontes |

LOW → não chama provedores externos (determinístico).

---

## Testes

- `src/modules/ai/__tests__/ai-router.service.test.ts`
- `src/modules/financial-advisor/__tests__/financial-advisor.service.test.ts`
- `src/app/api/advisor/ask/__tests__/route.test.ts`

---

## Roadmap IA

- Integrar `FinancialAdvisorService.ask` no fluxo Telegram (reuso do agregador).
- Opcional: unificar inbox NLP no `AiRouterService` (hoje Gemini dedicado na inbox).
