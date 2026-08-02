# Integração Companheiro Vorcaro com Telegram

Guia passo-a-passo para integrar o Companheiro Vorcaro ao sistema de Telegram existente.

## Visão Geral

O Companheiro Vorcaro é uma alternativa mais leve e amigável ao `VorcaroConversationService` existente. Ele é ideal para:
- Mensagens naturais sobre gastos/receitas
- Perguntas conversacionais
- Contexto de padrões de gasto
- Sugestões proativas

## Passo 1: Importar o Adapter

No arquivo `src/modules/telegram/application/process-telegram-update.service.ts`:

```typescript
import { TelegramCompanionAdapter } from '@/modules/vorcaro/companion/adapters/telegram-companion-adapter';
```

## Passo 2: Adicionar Routing no execute()

Após verificar a conexão e ANTES de criar `RegisterCognitiveTransactionUseCase`:

```typescript
async execute(message: TelegramMessage): Promise<TelegramWebhookResult> {
  // ... código existente ...

  const connection = await this.telegramIntegration.findActiveConnectionByChatId(BigInt(chatId));
  if (!connection) {
    // ... código existente ...
  }

  const userId = connection.userId;

  // ============ ADICIONAR AQUI ============
  // Verificar se deve rotear para Companheiro Vorcaro
  if (!hasVoice(message) && !hasPhoto(message) && !hasDocument(message) && text) {
    if (TelegramCompanionAdapter.shouldRouteToCompanion(text)) {
      try {
        const adapter = new TelegramCompanionAdapter(this.prisma);
        const response = await adapter.sendCompanionMessage(
          BigInt(chatId),
          userId,
          text
        );
        
        // Log para observabilidade
        console.log('[Companion]', {
          userId,
          intent: response.intent?.type,
          confidence: response.confidence,
          provider: response.provider,
        });

        return { ok: true, handled: "companion_chat" };
      } catch (error) {
        console.error('[Companion] Error:', error);
        await this.safeReply(chatId, '😅 Tive um problema ao processar sua mensagem. Tente novamente.');
        return { ok: true, handled: "companion_error" };
      }
    }
  }
  // ============ FIM DO TRECHO ============

  // ... resto do código continua normalmente (cognitive transaction, etc) ...
}
```

## Passo 3: Testar no Telegram

1. **Teste de gasto:**
   ```
   Gastei 150 com comida
   → Resposta amigável do Companheiro
   ```

2. **Teste de gasto compartilhado:**
   ```
   Gastei 300 com João no uber
   → Sugere divisão
   ```

3. **Teste de receita:**
   ```
   Recebi 500 de freelance
   → Celebra e confirma
   ```

4. **Teste de pergunta:**
   ```
   Qual meu saldo?
   → Responde com contexto
   ```

5. **Teste de comando (deve ir para Vorcaro):**
   ```
   /status
   → Vai para VorcaroConversationService (routing normal)
   ```

## Passo 4: Monitoramento

### Logs

```typescript
// Ver intents detectados
console.log(`Intent: ${response.intent?.type} (confidence: ${response.confidence})`);

// Ver provider
console.log(`Provider: ${response.provider} - ${response.model}`);
```

### Métricas (Opcional)

```typescript
// Adicionar a observabilidade
import { companionObservability } from '@/modules/vorcaro/companion/application/observability';

companionObservability.recordIntent(response.intent?.type);
companionObservability.recordProvider(response.provider);
companionObservability.recordLatency(endTime - startTime);
```

## Passo 5: Limpeza de Dados (Opcional)

Se precisar limpar a memória de um usuário:

```typescript
import { VorcaroCompanionMemoryService } from '@/modules/vorcaro/companion';

const memory = new VorcaroCompanionMemoryService();
await memory.clearHistory(userId);
```

## Configuração Avançada

### Customizar Routing

Para alterar quais mensagens vão para Companion:

```typescript
// Em telegram-companion-adapter.ts
static shouldRouteToCompanion(message: string): boolean {
  // Adicionar novo padrão
  const customPattern = /seu padrão aqui/i;
  
  return customPattern.test(message) || /* resto do código */;
}
```

### Customizar System Prompt

```typescript
import { buildCompanionPrompt } from '@/modules/vorcaro/companion';

// Usar prompt customizado
const systemPrompt = buildCompanionPrompt({
  userName: "João",
  currentMood: 'stressed',
  recentContext: "..."
});

// Depois usar em companionService.chat()
```

### Ajustar Temperatura

```typescript
// Em vorcaro-companion.service.ts
const result = await this.aiRouter.generateText({
  system: systemPrompt,
  prompt: fullPrompt,
  temperature: 0.5,  // ← Ajustar de 0.3 para mais criativo
  maxTokens: 800,
});
```

## Troubleshooting

### "Companion não está respondendo"

1. Verificar Redis:
   ```bash
   redis-cli ping
   # Deve responder "PONG"
   ```

2. Verificar AiRouter:
   ```typescript
   const aiRouter = new AiRouterService();
   const test = await aiRouter.generateText({
     system: "Teste",
     prompt: "Olá",
     maxTokens: 10
   });
   console.log(test);
   ```

3. Verificar adaptor:
   ```typescript
   const intent = extractCompanionIntent("Gastei 150");
   console.log(intent); // Deve detectar
   ```

### "Todas as mensagens vão para Companion"

Ajustar `shouldRouteToCompanion()` para ser mais seletivo:

```typescript
static shouldRouteToCompanion(message: string): boolean {
  // Mais restritivo
  const financialPatterns = [
    /^(?:gastei|gasto|recebi|ganhei)\s+\d+/i,
  ];

  return financialPatterns.some((pattern) => pattern.test(message));
}
```

### "Mensagens estão muito longas"

Ajustar em `vorcaro-companion.service.ts`:

```typescript
if (answer.length > 300) { // ← Reduzir de 500
  answer = answer.substring(0, 297) + '...';
}
```

## Observabilidade

Para adicionar observabilidade completa, criar:

```typescript
// src/modules/vorcaro/companion/application/observability.ts

export const companionObservability = {
  recordIntent: (intent?: string) => {
    console.log(`[Companion] Intent: ${intent}`);
    // Adicionar métrica
  },
  
  recordProvider: (provider: string) => {
    console.log(`[Companion] Provider: ${provider}`);
    // Adicionar métrica
  },
  
  recordLatency: (ms: number) => {
    console.log(`[Companion] Latency: ${ms}ms`);
    // Adicionar métrica
  },
};
```

## Rollback

Se precisar remover a integração:

1. Remover o bloco de código do `execute()`
2. Remover imports
3. Mensagens voltarão a `RegisterCognitiveTransactionUseCase`

## Próximos Passos

1. ✅ Integração básica
2. ⏳ Adicionar observabilidade
3. ⏳ Treinar LLM com mais exemplos
4. ⏳ Adicionar preferências de usuário
5. ⏳ Melhorar detecção de emoções

## Suporte

Dúvidas? Verificar:
- `README.md` - Documentação geral
- `__tests__/vorcaro-companion-intent.test.ts` - Exemplos
- `adapters/telegram-companion-adapter.ts` - Código de integração
