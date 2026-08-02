# Companheiro Vorcaro: Quick Start

Guia rápido para começar a usar em 5 minutos.

## Instalação

Já está instalado! Basta importar:

```typescript
import { VorcaroCompanionService } from '@/modules/vorcaro/companion';
```

## Uso Básico

### 1. Chat Simples

```typescript
import { VorcaroCompanionService } from '@/modules/vorcaro/companion';

const companion = new VorcaroCompanionService(prisma);

const response = await companion.chat({
  userId: "user-123",
  message: "Gastei 150 com comida",
  channel: 'telegram'
});

console.log(response.answer); // "Registrado! Gasto de R$ 150 em Alimentação"
```

### 2. Extrair Intent Apenas

```typescript
import { extractCompanionIntent } from '@/modules/vorcaro/companion';

const intent = extractCompanionIntent("Gastei 150 com meu irmão");
// {
//   type: 'gasto',
//   amount: 150,
//   isPeople: ['irmão'],
//   category: 'Outro',
//   confidence: 0.9
// }
```

### 3. Acessar Histórico

```typescript
import { VorcaroCompanionMemoryService } from '@/modules/vorcaro/companion';

const memory = new VorcaroCompanionMemoryService();

// Obter contexto
const context = await memory.getContext("user-123");
console.log(context.messages); // Últimas 20 mensagens
console.log(context.stats);    // Estatísticas de gasto

// Adicionar mensagem
await memory.addMessage("user-123", "user", "Gastei 150");
```

### 4. Integrar com Telegram

```typescript
import { TelegramCompanionAdapter } from '@/modules/vorcaro/companion';

// No process-telegram-update.service.ts
if (TelegramCompanionAdapter.shouldRouteToCompanion(text)) {
  const adapter = new TelegramCompanionAdapter(this.prisma);
  await adapter.sendCompanionMessage(BigInt(chatId), userId, text);
  return { ok: true, handled: "companion_chat" };
}
```

## Exemplos Reais

### Gasto Simples
```
User: Gastei 150 em comida
→ Vorcaro: Registrado! Gasto de R$ 150 em Alimentação
```

### Gasto Compartilhado
```
User: Gastei 300 com João no uber
→ Vorcaro: Legal! Quer que eu divida em 2? Cada um paga R$150
```

### Pergunta Financeira
```
User: Qual meu saldo?
→ Vorcaro: Você tem R$1,200. Se continuar assim, nega em 5 dias.
```

### Receita
```
User: Recebi 500 de freelance
→ Vorcaro: Ótimo! Receita de R$500 de Trabalho anotada ✅
```

## Intents Suportados

| Intent | Exemplo | Resposta |
|--------|---------|----------|
| `gasto` | "Gastei 150" | Registra despesa |
| `receita` | "Recebi 500" | Celebra receita |
| `pergunta` | "Qual meu saldo?" | Responde com dados |
| `contexto` | "Gasto muito" | Sugere economia |
| `celebracao` | "Consegui economizar!" | Celebra junto |
| `stresse` | "Quebrei de gasto" | Oferece ajuda |
| `outro` | "Oi" | Resposta genérica |

## API Reference

### VorcaroCompanionService

```typescript
chat(request: CompanionChatRequest): Promise<CompanionChatResponse>
```

**Request:**
```typescript
{
  userId: string;
  message: string;
  channel?: 'telegram' | 'web' | 'api';
}
```

**Response:**
```typescript
{
  answer: string;
  intent?: ParsedCompanionIntent;
  suggestion?: string;
  provider: string;    // "claude", "gemini", etc
  model: string;
  confidence: number;  // 0-1
}
```

### VorcaroCompanionMemoryService

```typescript
getContext(userId: string): Promise<ConversationContext>
addMessage(userId: string, role: 'user' | 'assistant', message: string): Promise<void>
recordTransaction(userId: string, type: 'income' | 'expense', amount: number, category?: string): Promise<void>
buildHistoryBlock(userId: string, limit?: number): Promise<string>
getSuggestion(userId: string): Promise<string | null>
setUserPreference(userId: string, key: string, value: any): Promise<void>
clearHistory(userId: string): Promise<void>
```

### extractCompanionIntent

```typescript
extractCompanionIntent(message: string): ParsedCompanionIntent
```

**Returns:**
```typescript
{
  type: 'gasto' | 'receita' | 'pergunta' | 'contexto' | 'celebracao' | 'stresse' | 'outro';
  amount?: number;
  category?: string;
  isPeople?: string[];
  confidence: number; // 0-1
  original: string;
}
```

## Configurações

### Redis (Obrigatório)

```bash
# Verificar conexão
redis-cli ping
# PONG ✓
```

### AiRouter (Obrigatório)

Já configurado automaticamente. Usa qualquer provider disponível (Claude, Gemini, etc).

### Variáveis de Ambiente (Opcional)

```env
# Usar defaults se não especificado
COMPANION_REDIS_TTL=86400        # 24 horas
COMPANION_MAX_MESSAGES=20
COMPANION_TEMPERATURE=0.3
COMPANION_MAX_TOKENS=800
```

## Testes

```bash
# Rodar testes
npm test -- companion-intent.test.ts

# Com coverage
npm test -- --coverage companion-intent.test.ts

# Watch mode
npm test -- --watch companion-intent.test.ts
```

## Troubleshooting

### "Redis is not available"
```bash
# Iniciar Redis
redis-server
```

### "No AI provider available"
```bash
# Verificar AiRouter
# Em src/modules/ai/application/services/ai-router.service.ts
```

### "Intent not detected"
```typescript
const intent = extractCompanionIntent("sua mensagem");
console.log(intent); // Debug
// Adicionar padrão em vorcaro-companion-intent.ts se necessário
```

## Próximos Passos

1. **Integrar com Telegram** → Veja `INTEGRATION.md`
2. **Adicionar mais categorias** → Editar `extractCategory()` em intent.ts
3. **Customizar prompt** → Editar `VORCARO_COMPANION_SYSTEM_PROMPT`
4. **Adicionar observabilidade** → Criar observability.ts

## Documentação Completa

- `README.md` - Visão geral e filosofia
- `INTEGRATION.md` - Guia de integração com Telegram
- `usage-examples.ts` - 8 exemplos práticos
- Testes em `__tests__/` - Mais exemplos

## Suporte

Dúvidas? Verificar:
1. Os exemplos em `examples/usage-examples.ts`
2. Os testes em `__tests__/vorcaro-companion-intent.test.ts`
3. O código comentado em cada arquivo
