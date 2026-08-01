import Redis from 'ioredis';

export class TelegramDeduplicationService {
  private redis: Redis;

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async checkDuplicate(
    userId: string,
    amount: number,
    category: string,
  ): Promise<{ isDuplicate: boolean; minutesAgo?: number }> {
    const key = `dedup:${userId}:${amount}:${category}`;
    const exists = await this.redis.exists(key);

    if (exists) {
      const ttl = await this.redis.ttl(key);
      const minutesAgo = Math.ceil((600 - ttl) / 60);
      return { isDuplicate: true, minutesAgo };
    }

    // Set with 10 minute TTL
    await this.redis.setex(key, 600, Date.now().toString());
    return { isDuplicate: false };
  }

  formatDuplicateWarning(amount: number, category: string, minutesAgo: number): string {
    return `⚠️ Já lançaste R$${amount.toFixed(2)} em ${category} há ${minutesAgo} min`;
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
