/**
 * Companheiro Vorcaro: Main Companion Service
 * Orchestrates personality, intent extraction, memory, and Gemini integration
 */

import type { PrismaClient } from '@prisma/client';
import { AiRouterService } from '@/modules/ai/application/services/ai-router.service';
import {
  buildCompanionPrompt,
  VORCARO_COMPANION_SYSTEM_PROMPT,
  type CompanionPromptOptions,
} from '../domain/vorcaro-companion-system-prompt';
import {
  extractCompanionIntent,
  generateIntentSuggestion,
  type ParsedCompanionIntent,
} from '../domain/vorcaro-companion-intent';
import {
  VorcaroCompanionMemoryService,
  type ConversationContext,
} from './vorcaro-companion-memory.service';

export interface CompanionChatRequest {
  userId: string;
  message: string;
  channel?: 'telegram' | 'web' | 'api';
}

export interface CompanionChatResponse {
  answer: string;
  intent?: ParsedCompanionIntent;
  suggestion?: string;
  provider: string;
  model: string;
  confidence: number;
}

export class VorcaroCompanionService {
  private readonly memory = new VorcaroCompanionMemoryService();
  private readonly aiRouter = new AiRouterService();

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Main chat method
   */
  async chat(request: CompanionChatRequest): Promise<CompanionChatResponse> {
    const { userId, message, channel = 'telegram' } = request;

    // 1. Extract intent from user message
    const intent = extractCompanionIntent(message);

    // 2. Fetch conversation context
    const context = await this.memory.getContext(userId);

    // 3. Add user message to history
    await this.memory.addMessage(userId, 'user', message);

    // 4. Handle special intents (transactions)
    if (intent.type === 'gasto' && intent.amount) {
      await this.memory.recordTransaction(userId, 'expense', intent.amount, intent.category);
    }
    if (intent.type === 'receita' && intent.amount) {
      await this.memory.recordTransaction(userId, 'income', intent.amount, intent.category);
    }

    // 5. Build AI context
    const historyBlock = await this.memory.buildHistoryBlock(userId, 10);
    const systemPrompt = this.buildSystemPrompt(context);

    // 6. Prepare full prompt for AI
    const fullPrompt = this.buildFullPrompt(message, historyBlock, intent, context);

    // 7. Call AI (Gemini via AiRouter)
    let answer: string;
    try {
      const result = await this.aiRouter.generateText({
        system: systemPrompt,
        prompt: fullPrompt,
        temperature: 0.3, // Keep it consistent with personality
        maxTokens: 800,
      });
      answer = result.text;

      // 8. Post-process answer
      answer = this.sanitizeAnswer(answer);

      // 9. Add assistant message to history
      await this.memory.addMessage(userId, 'assistant', answer);

      // 10. Get suggestions for next interaction
      const suggestion = await this.memory.getSuggestion(userId);

      return {
        answer,
        intent,
        suggestion: suggestion || undefined,
        provider: result.provider,
        model: result.model,
        confidence: intent.confidence,
      };
    } catch (error) {
      console.error('[CompanionService] AI error:', error);
      const fallback = this.buildFallbackAnswer(intent, message);
      await this.memory.addMessage(userId, 'assistant', fallback);
      return {
        answer: fallback,
        intent,
        provider: 'fallback',
        model: 'intent-engine',
        confidence: 0.5,
      };
    }
  }

  /**
   * Build system prompt with personalization
   */
  private buildSystemPrompt(context: ConversationContext): string {
    const options: CompanionPromptOptions = {
      userName: context.userPreferences?.name,
    };

    // Detect mood based on recent transactions
    if (context.lastTransaction) {
      if (context.stats && context.stats.totalExpenses > context.stats.totalIncome * 2) {
        options.currentMood = 'stressed';
      } else if (context.stats && context.stats.totalIncome > 0) {
        options.currentMood = 'happy';
      }
    }

    // Add recent context
    const recentMessages = context.messages.slice(-4);
    if (recentMessages.length > 0) {
      options.recentContext = recentMessages
        .map((m) => `${m.role}: ${m.content.slice(0, 100)}`)
        .join('\n');
    }

    return buildCompanionPrompt(options);
  }

  /**
   * Build full prompt for AI
   */
  private buildFullPrompt(
    userMessage: string,
    history: string,
    intent: ParsedCompanionIntent,
    context: ConversationContext,
  ): string {
    const lines = [
      '### Histórico da Conversa',
      history,
      '',
      '### Mensagem Atual',
      userMessage,
      '',
      '### Análise de Intent',
      `- Tipo: ${intent.type}`,
      intent.amount ? `- Valor: R$ ${intent.amount.toFixed(2).replace('.', ',')}` : '',
      intent.category ? `- Categoria: ${intent.category}` : '',
      intent.isPeople?.length ? `- Pessoas: ${intent.isPeople.join(', ')}` : '',
      `- Confiança: ${(intent.confidence * 100).toFixed(0)}%`,
      '',
      '### Contexto do Usuário',
      context.stats
        ? `- Total gasto este período: R$ ${context.stats.totalExpenses.toFixed(2).replace('.', ',')}`
        : '',
      context.stats
        ? `- Total recebido este período: R$ ${context.stats.totalIncome.toFixed(2).replace('.', ',')}`
        : '',
      context.lastTransaction
        ? `- Última transação: ${context.lastTransaction.type === 'expense' ? 'Despesa' : 'Receita'} de R$ ${context.lastTransaction.amount.toFixed(2).replace('.', ',')}`
        : '',
      '',
      '### Sua Resposta',
      'Responda naturalmente, como um amigo. Use os dados acima como contexto.',
      'Se for aplicável, use a sugestão de resposta automática como base.',
    ];

    // Add intent suggestion if available
    const suggestion = generateIntentSuggestion(intent);
    if (suggestion) {
      lines.push('', `Sugestão automática (adapte livremente): ${suggestion}`);
    }

    return lines.filter(Boolean).join('\n');
  }

  /**
   * Build fallback answer when AI is unavailable
   */
  private buildFallbackAnswer(intent: ParsedCompanionIntent, message: string): string {
    // Try to use intent suggestion
    const suggestion = generateIntentSuggestion(intent);
    if (suggestion) {
      return suggestion;
    }

    // Fallback responses based on intent type
    const fallbacks: Record<string, string> = {
      gasto: 'Registrado! 📝',
      receita: 'Ótimo! Receita anotada. 💰',
      pergunta: 'Que pergunta! Deixa eu pensar... Tente novamente em um instante.',
      celebracao: '🎉 Que legal!',
      stresse: 'Entendo. Estou aqui pra ajudar. Tente novamente em um instante.',
      contexto: 'Anotado! 📊',
      outro: 'Verdade! E agora, como posso ajudar?',
    };

    return fallbacks[intent.type] || 'Entendi! 👂 Deixa eu processar isso...';
  }

  /**
   * Sanitize AI answer
   */
  private sanitizeAnswer(answer: string): string {
    // Remove markdown excessive formatting
    answer = answer.replace(/###/g, '**').replace(/##/g, '**').replace(/#/g, '*');

    // Ensure no over-emojis
    const emojiCount = (answer.match(/[\p{Emoji}]/gu) || []).length;
    if (emojiCount > 5) {
      answer = answer.replace(/[\p{Emoji}]/gu, '');
    }

    // Keep it under 500 chars for Telegram
    if (answer.length > 500) {
      answer = answer.substring(0, 497) + '...';
    }

    return answer.trim();
  }
}
