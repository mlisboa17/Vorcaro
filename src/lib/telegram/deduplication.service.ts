/**
 * Sprint 0 — Melhoria 3: Deduplicação Local com Redis
 * Rastreia transações recentes para detectar duplicatas em <10 minutos
 */

import { getRedisConnection } from "@/lib/queue";
import type { TransactionFingerprint, DuplicateCheckResult } from "./persistent-menu";
import { checkTransactionDuplicate, generateTransactionFingerprint } from "./persistent-menu";

const DEDUP_CACHE_TTL = 600; // 10 minutos em segundos

interface StoredFingerprint extends TransactionFingerprint {
  category: string;
}

export class TransactionDeduplicationService {
  /**
   * Registra uma transação no cache de deduplicação
   */
  async recordTransaction(userId: string, amount: number, category: string): Promise<void> {
    const redis = getRedisConnection();
    const key = `telegram:dedup:${userId}:last_transaction`;

    const fingerprint: StoredFingerprint = {
      amount,
      category,
      timestamp: Date.now(),
    };

    await redis.setex(key, DEDUP_CACHE_TTL, JSON.stringify(fingerprint));
  }

  /**
   * Verifica se uma transação é duplicata baseada no histórico recente
   */
  async checkDuplicate(
    userId: string,
    amount: number,
    category: string,
  ): Promise<DuplicateCheckResult> {
    const redis = getRedisConnection();
    const key = `telegram:dedup:${userId}:last_transaction`;

    const storedStr = await redis.get(key);
    if (!storedStr) {
      // Nenhuma transação recente, não é duplicata
      return { isDuplicate: false };
    }

    try {
      const previous = JSON.parse(storedStr) as StoredFingerprint;
      const current = generateTransactionFingerprint(amount, category, Date.now());

      return checkTransactionDuplicate(current, previous);
    } catch (error) {
      console.error("[deduplication] Erro ao parsear fingerprint:", error);
      return { isDuplicate: false };
    }
  }

  /**
   * Limpa o histórico de deduplicação de um usuário (após confirmação)
   */
  async clearDuplicateCheck(userId: string): Promise<void> {
    const redis = getRedisConnection();
    const key = `telegram:dedup:${userId}:last_transaction`;
    await redis.del(key);
  }

  /**
   * Armazena um "override" quando o usuário escolhe "Enviar mesmo assim"
   */
  async allowDuplicate(userId: string, amount: number, category: string): Promise<void> {
    await this.recordTransaction(userId, amount, category);
  }
}

export const deduplicationService = new TransactionDeduplicationService();
