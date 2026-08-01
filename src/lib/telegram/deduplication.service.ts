import { getRedisConnection } from '@/lib/queue';

export class TelegramDeduplicationService {
  private redis: ReturnType<typeof getRedisConnection>;

  constructor() {
    this.redis = getRedisConnection();
  }

  async checkDuplicate(
    userId: string,
    amount: number,
    category: string,
  ): Promise<{ isDuplicate: boolean; minutesAgo?: number; message?: string }> {
    const key = `dedup:${userId}:${amount}:${category}`;
    const exists = await this.redis.exists(key);

    if (exists) {
      const ttl = await this.redis.ttl(key);
      const minutesAgo = Math.ceil((600 - ttl) / 60);
      const message = this.formatDuplicateWarning(amount, category, minutesAgo);
      return { isDuplicate: true, minutesAgo, message };
    }

    // Set with 10 minute TTL
    await this.redis.setex(key, 600, Date.now().toString());
    return { isDuplicate: false };
  }

  async allowDuplicate(userId: string, amount: number, category: string): Promise<void> {
    const key = `dedup:${userId}:${amount}:${category}`;
    await this.redis.del(key);
  }

  async recordTransaction(userId: string, amount: number, category: string): Promise<void> {
    const key = `dedup:${userId}:${amount}:${category}`;
    await this.redis.setex(key, 600, Date.now().toString());
  }

  formatDuplicateWarning(amount: number, category: string, minutesAgo: number): string {
    return `⚠️ Já lançaste R$${amount.toFixed(2).replace('.', ',')} em ${category} há ${minutesAgo} min`;
  }

  getDuplicateButtons() {
    return {
      inline_keyboard: [
        [
          { text: '✅ Enviar mesmo assim', callback_data: 'dedup_override' },
          { text: '❌ Cancelar', callback_data: 'dedup_cancel' },
        ],
      ],
    };
  }
}

// Singleton instance
export const deduplicationService = new TelegramDeduplicationService();
