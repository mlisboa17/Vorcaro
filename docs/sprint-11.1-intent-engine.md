# Sprint 11.1 — Vorcaro Intent Engine e Tool Calling

## Objetivo

Transformar o Vorcaro de chat LLM-first para um sistema orientado por intenções, ferramentas internas e dados reais — reduzindo custo, latência e alucinações.

## Arquitetura

```text
Pergunta
  ↓
VorcaroIntentEngineService
  ↓
VorcaroToolResolverService
  ↓
VorcaroToolExecutorService (+ RulesAutomationTool)
  ↓
Dados reais (Prisma / serviços existentes)
  ↓
VorcaroIntentResponseFormatter (FATO → IMPACTO → AÇÃO)
  ↓
Resposta
```

Fallback LLM quando `requiresLlm === true` ou intenção sem ferramentas mapeadas.

## Módulo

```
src/modules/vorcaro/intent/
├── domain/types/vorcaro-intent.ts
├── application/services/
│   ├── vorcaro-intent-engine.service.ts
│   ├── vorcaro-tool-resolver.service.ts
│   ├── vorcaro-tool-calling.service.ts
│   ├── vorcaro-tool-executor.service.ts
│   ├── vorcaro-intent-response-formatter.service.ts
│   ├── vorcaro-intent-cache.service.ts
│   └── vorcaro-intent-observability.service.ts
├── application/tools/rules-automation-tool.ts
└── __tests__/
```

## Intenções (`VorcaroIntent`)

| Intenção | Exemplos | Ferramentas |
|----------|----------|-------------|
| STATUS | "Como estou financeiramente?" | health, alerts, goals, money_leak, commitments |
| ALERTS | "Existe algo urgente?" | financial_alerts |
| RECEIVABLES | "Quem está me devendo?" | receivables |
| GOALS | "Como estão minhas metas?" | financial_goals |
| EXPENSES | "Onde estou gastando mais?" | spending_analysis |
| CASHFLOW | "Vou ficar negativo?" | cashflow_projection |
| COMMITMENTS | "Compromissos do mês" | monthly_commitments |
| SUBSCRIPTIONS | "Assinaturas duplicadas" | subscription_detector |
| MONEY_LEAK | "Onde estou perdendo dinheiro?" | money_leak_detector (+ subscriptions) |
| NOTIFICATIONS | "Minhas notificações" | notification_query |
| RULES_AUTOMATIONS | "Quais regras existem?" | rules_automation |
| GENERAL_CHAT / UNKNOWN | Perguntas abertas | → LLM |

## Contrato `VorcaroToolResult`

```typescript
interface VorcaroToolResult {
  intent: VorcaroIntent;
  title: string;
  summary: string;
  facts: string[];
  metrics: Record<string, unknown>;
  recommendations: string[];
}
```

## RulesAutomationTool

- **Permite:** explicar regras, classificações, padrões aprendidos, taxonomia; sugerir novas regras (texto).
- **Não permite:** criar, alterar ou excluir regras automaticamente — confirmação humana obrigatória.

## Observabilidade

Métricas in-process (`vorcaroIntentObservability`):

| Métrica | Significado |
|---------|-------------|
| `intent_detected` | Intenção classificada |
| `tool_called` | Ferramenta executada |
| `tool_only_response` | Resposta sem LLM |
| `llm_called` | LLM invocado |
| `fallback_to_llm` | Intent sem tool ou estratégica |

## Cache

- Intent cache e tool result cache — TTL **60 segundos**
- Chaves escopadas por `userId`

## Segurança

- Multitenancy: todas as ferramentas recebem `userId` da sessão
- Rate limit e validação de sessão herdados do `VorcaroConversationService`
- Nenhuma ferramenta retorna dados de outro usuário

## Integração

`VorcaroConversationService.sendMessage()`:

1. Rate limit + memória + agregador + guardrail de dados
2. `VorcaroToolCallingService.execute()`
3. Se `responseMode === "tool"` → resposta determinística (`provider: deterministic`, `model: intent-engine`)
4. Senão → LLM com métricas `fallback_to_llm` + `llm_called`

## Comandos Telegram (sem LLM)

`/status`, `/alertas`, `/recebiveis`, `/metas`, `/gastos`, `/oportunidades` — mapeados pelo Intent Engine.

## Testes

```bash
npm test -- --run
npx tsc --noEmit
npx prisma validate
```

Cobertura: intent detection, tool resolver, formatter, cache TTL, observabilidade, RulesAutomationTool (somente leitura).

## Fora de escopo

WhatsApp, execução automática de regras, pagamentos, integrações bancárias novas.

## Próximo passo

Sprint 12 — Memória Financeira Longitudinal.
