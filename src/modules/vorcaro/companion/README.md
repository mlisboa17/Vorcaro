# Companheiro Vorcaro: IA Conversacional Natural

Um assistente financeiro amigável que funciona como seu amigo, não como um robô.

## Filosofia

Vorcaro é como um **amigo financeiro**:
- Conversacional (não robótico)
- Entende contexto ("Gastei com meu irmão" = split?)
- Aprende (lembra conversas)
- Proativo (avisa antes do problema)
- Personagem com personalidade (educado, atencioso, às vezes funny)

## Arquitetura

```
companion/
├── domain/
│   ├── vorcaro-companion-system-prompt.ts    # Personality & system prompt
│   └── vorcaro-companion-intent.ts            # Intent extraction with regex
├── application/services/
│   ├── vorcaro-companion-memory.service.ts    # Multi-turn memory (Redis)
│   └── vorcaro-companion.service.ts            # Main orchestration
├── adapters/
│   └── telegram-companion-adapter.ts          # Telegram integration
└── __tests__/
    └── vorcaro-companion-intent.test.ts       # Unit tests
```

## Como Funciona

### 1. Intent Extraction (Local NLP)

Não usa ML pesado, apenas regex simples:

```typescript
extractCompanionIntent("Gastei 150 com meu irmão no uber")
// → {
//   type: 'gasto',
//   amount: 150,
//   category: 'Transporte',
//   isPeople: ['irmão'],
//   confidence: 0.9
// }
```

**Suported Intents:**
- `gasto` - Despesa ("Gastei 150")
- `receita` - Receita ("Recebi 500")
- `pergunta` - Pergunta ("Qual meu saldo?")
- `contexto` - Padrão de gasto ("Gasto muito em comida")
- `celebracao` - Vitória financeira ("Consegui economizar!")
- `stresse` - Situação difícil ("Quebrei, não aguento")
- `outro` - Qualquer outra coisa

### 2. Multi-turn Memory (Redis)

Armazena até 20 mensagens recentes + contexto:

```typescript
const context = await memory.getContext(userId);
// → {
//   userId: "user-123",
//   messages: [...],
//   lastTransaction: { type, amount, category, timestamp },
//   userPreferences: { name, tone, currencyFormat },
//   stats: { totalExpenses, totalIncome, messageCount }
// }
```

**TTL:** 24 horas (renovado a cada mensagem)

### 3. Conversação com Gemini/Claude

Usa `AiRouterService` (mesmo do Vorcaro):

```typescript
const response = await companionService.chat({
  userId: "user-123",
  message: "Gastei 150 com meu irmão no uber",
  channel: 'telegram'
});

// → {
//   answer: "Legal! Quer que eu divida em 2? Cada um paga R$75",
//   intent: { type: 'gasto', amount: 150, ... },
//   suggestion: "...",
//   provider: "claude",
//   model: "claude-3-5-sonnet",
//   confidence: 0.9
// }
```

### 4. Sugestões Automáticas

Baseado em padrões de histórico:

```typescript
const suggestion = await memory.getSuggestion(userId);
// "Essas 5 comidas = R$500. Potencial economia: R$200?"
// "Já registramos 10 transações. Quer ver seu resumo?"
```

## Integração com Telegram

### Opção 1: Plugin Automático (Recomendado)

```typescript
// Em src/modules/telegram/application/process-telegram-update.service.ts

if (TelegramCompanionAdapter.shouldRouteToCompanion(text)) {
  try {
    const adapter = new TelegramCompanionAdapter(this.prisma);
    await adapter.sendCompanionMessage(BigInt(chatId), userId, text);
    return { ok: true, handled: "companion_chat" };
  } catch (error) {
    await this.safeReply(chatId, 'Tive um problema. Tente novamente.');
    return { ok: true, handled: "companion_error" };
  }
}
```

### Opção 2: Manual

```typescript
import { VorcaroCompanionService } from '@/modules/vorcaro/companion';

const companion = new VorcaroCompanionService(prisma);
const response = await companion.chat({
  userId: "user-123",
  message: userMessage,
  channel: 'telegram'
});

await sendTelegramMessage(chatId, response.answer);
```

## Exemplos de Conversação

### Exemplo 1: Gasto Compartilhado

```
User: Gastei 150 com meu irmão no uber
Vorcaro: Legal! Quer que eu divida em 2 (R$75 cada)? Ou era só você?
```

### Exemplo 2: Padrão de Gasto

```
User: Gasto muito em comida
Vorcaro: Vi que você gastou 5x comida esta semana (R$500). 
         Padrão novo? Quer dicas de economia?
```

### Exemplo 3: Pergunta Financeira

```
User: Qual meu saldo?
Vorcaro: Você tem R$1,200. Se continuar neste ritmo, 
         saldo nega em 5 dias. Tudo certo?
```

### Exemplo 4: Receita

```
User: Peguei um freelance de 500
Vorcaro: Ótimo! Quanto você vai receber e quando? 
         Ajudo a registrar aqui.
```

## Testes

```bash
# Rodar testes de intent extraction
npm test -- companion-intent.test.ts

# Testes unitários cobrem:
# - Detecta despesas simples e com split
# - Detecta receitas
# - Detecta perguntas
# - Detecta emoções (celebração, stress)
# - Extrai categorias
# - Trata edge cases
```

## Configuração

### Variáveis de Ambiente

```env
# Em .env (opcional, usa defaults)
COMPANION_REDIS_TTL=86400        # Tempo de vida da memória (segundos)
COMPANION_MAX_MESSAGES=20        # Máximo de mensagens armazenadas
COMPANION_TEMPERATURE=0.3        # Temperatura LLM (0.0-1.0)
COMPANION_MAX_TOKENS=800         # Máximo de tokens na resposta
```

### Personalização

```typescript
// Customizar sistema de prompt
const customPrompt = buildCompanionPrompt({
  userName: "João",
  currentMood: 'stressed',
  recentContext: "..."
});

// Customizar sugestões
const suggestion = generateIntentSuggestion(intent);
```

## Performance

- **Latência:** ~500ms (local regex) + ~2s (LLM)
- **Memória:** ~1KB por usuário/dia
- **Redis:** Usa `SETEX` com TTL automático
- **Temperatura:** 0.3 (consistente, previsível)

## Limitações & Roadmap

### MVP (v1) ✅
- [x] System prompt amigável
- [x] Intent extraction com regex
- [x] Multi-turn memory em Redis
- [x] Integração com Gemini/Claude
- [x] Sugestões automáticas
- [x] Adapter para Telegram

### v2 (Future)
- [ ] Detectar humor com sentimento analysis
- [ ] Aprender preferências de tom
- [ ] Sugestões baseadas em padrões ML
- [ ] Integração com ações estruturadas
- [ ] Persistência em banco de dados

## Troubleshooting

### Memória não está funcionando

```typescript
// Verificar Redis connection
const redis = getRedisConnection();
const test = await redis.ping();
console.log(test); // "PONG"
```

### Intent extraction não está detectando

```typescript
// Debug
const intent = extractCompanionIntent("Seu mensagem");
console.log(intent);
// Verificar se o padrão regex está no PATTERNS
```

### AI não está respondendo

```typescript
// Verificar AiRouter
const aiRouter = new AiRouterService();
const result = await aiRouter.generateText({
  system: "Test",
  prompt: "Test",
  maxTokens: 100
});
```

## Contribuindo

1. Adicione novos padrões regex em `vorcaro-companion-intent.ts`
2. Adicione testes correspondentes
3. Atualize `README.md`
4. Teste integração com Telegram

## License

Parte do projeto LOGOS • 2026
