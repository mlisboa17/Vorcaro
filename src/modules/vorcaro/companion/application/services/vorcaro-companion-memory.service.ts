/**
 * Companheiro Vorcaro: Multi-turn Memory Service
 * Stores conversation context in Redis for persistence
 */

import { getRedisConnection } from '@/lib/queue';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ConversationContext {
  userId: string;
  messages: ConversationMessage[];
  lastTransaction?: {
    type: 'income' | 'expense';
    amount: number;
    category?: string;
    timestamp: number;
  };
  userPreferences?: {
    name?: string;
    tone?: 'formal' | 'amigável' | 'direto';
    currencyFormat?: 'R$' | 'r$' | 'real';
  };
  stats?: {
    totalExpenses: number;
    totalIncome: number;
    messageCount: number;
  };
}

const MEMORY_TTL = 86400; // 24 hours in seconds

export class VorcaroCompanionMemoryService {
  private redis = getRedisConnection();

  /**
   * Get conversation context for a user
   */
  async getContext(userId: string): Promise<ConversationContext> {
    const key = this.getContextKey(userId);

    try {
      const data = await this.redis.get(key);
      if (!data) {
        return this.initializeContext(userId);
      }

      return JSON.parse(data) as ConversationContext;
    } catch (error) {
      console.warn(`[CompanionMemory] Failed to retrieve context for ${userId}:`, error);
      return this.initializeContext(userId);
    }
  }

  /**
   * Add a message to conversation history
   */
  async addMessage(
    userId: string,
    role: 'user' | 'assistant',
    message: string,
  ): Promise<void> {
    const context = await this.getContext(userId);
    const key = this.getContextKey(userId);

    // Keep only last 20 messages to avoid memory bloat
    if (context.messages.length >= 20) {
      context.messages = context.messages.slice(-19);
    }

    context.messages.push({
      role,
      content: message,
      timestamp: Date.now(),
    });

    if (context.stats) {
      context.stats.messageCount += 1;
    }

    await this.redis.setex(key, MEMORY_TTL, JSON.stringify(context));
  }

  /**
   * Store a transaction for context awareness
   */
  async recordTransaction(
    userId: string,
    type: 'income' | 'expense',
    amount: number,
    category?: string,
  ): Promise<void> {
    const context = await this.getContext(userId);
    const key = this.getContextKey(userId);

    context.lastTransaction = {
      type,
      amount,
      category,
      timestamp: Date.now(),
    };

    if (!context.stats) {
      context.stats = { totalExpenses: 0, totalIncome: 0, messageCount: 0 };
    }

    if (type === 'expense') {
      context.stats.totalExpenses += amount;
    } else {
      context.stats.totalIncome += amount;
    }

    await this.redis.setex(key, MEMORY_TTL, JSON.stringify(context));
  }

  /**
   * Get recent messages as a formatted block for LLM context
   */
  async buildHistoryBlock(userId: string, limit: number = 10): Promise<string> {
    const context = await this.getContext(userId);
    const recentMessages = context.messages.slice(-limit);

    if (recentMessages.length === 0) {
      return '(Sem histórico de conversa)';
    }

    return recentMessages
      .map((msg) => {
        const role = msg.role === 'user' ? 'Você' : 'Vorcaro';
        return `${role}: ${msg.content}`;
      })
      .join('\n');
  }

  /**
   * Get suggestion based on user pattern
   */
  async getSuggestion(userId: string): Promise<string | null> {
    const context = await this.getContext(userId);

    if (!context.lastTransaction || !context.stats) {
      return null;
    }

    const { lastTransaction, stats } = context;

    // Suggest if user had 5+ expenses in short time
    if (lastTransaction.type === 'expense') {
      const recentExpenses = context.messages
        .filter((msg) => msg.role === 'assistant' && msg.content.includes('Gasto de'))
        .slice(-5);

      if (recentExpenses.length >= 5) {
        const avgExpense = stats.totalExpenses / recentExpenses.length;
        const savings = Math.round(avgExpense * 0.4);
        return `Essas ${recentExpenses.length} transações = R$ ${stats.totalExpenses.toFixed(2).replace('.', ',')}. Potencial economia: R$ ${savings}?`;
      }
    }

    // Suggest balance check if many transactions
    if (stats.messageCount > 0 && stats.messageCount % 5 === 0) {
      return `Já registramos ${stats.messageCount} transações. Quer ver seu resumo?`;
    }

    return null;
  }

  /**
   * Update user preferences
   */
  async setUserPreference(
    userId: string,
    key: keyof ConversationContext['userPreferences'],
    value: any,
  ): Promise<void> {
    const context = await this.getContext(userId);
    const memKey = this.getContextKey(userId);

    if (!context.userPreferences) {
      context.userPreferences = {};
    }

    (context.userPreferences[key] as any) = value;

    await this.redis.setex(memKey, MEMORY_TTL, JSON.stringify(context));
  }

  /**
   * Clear conversation history
   */
  async clearHistory(userId: string): Promise<void> {
    const key = this.getContextKey(userId);
    await this.redis.del(key);
  }

  /**
   * Private helpers
   */
  private getContextKey(userId: string): string {
    return `companion:context:${userId}`;
  }

  private initializeContext(userId: string): ConversationContext {
    return {
      userId,
      messages: [],
      stats: {
        totalExpenses: 0,
        totalIncome: 0,
        messageCount: 0,
      },
    };
  }
}
