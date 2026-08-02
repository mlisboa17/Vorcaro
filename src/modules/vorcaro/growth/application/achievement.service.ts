import Redis from 'ioredis';
import { ACHIEVEMENTS, UserAchievement, calculateLevel, calculateProgressToNextLevel, getLevelBadge } from '../domain/achievement';

export class AchievementService {
  private redis: Redis;

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Desbloquear achievement para usuário
   */
  async unlockAchievement(userId: string, achievementId: string): Promise<boolean> {
    try {
      const achievement = ACHIEVEMENTS[achievementId];
      if (!achievement) {
        console.warn(`Achievement ${achievementId} not found`);
        return false;
      }

      // Verificar se já está desbloqueado
      const alreadyUnlocked = await this.redis.exists(`achievement:${userId}:${achievementId}`);
      if (alreadyUnlocked) {
        return false; // Já estava desbloqueado
      }

      const unlockedAt = new Date();

      // Salvar no Redis (24 horas TTL)
      await this.redis.setex(
        `achievement:${userId}:${achievementId}`,
        86400 * 30, // 30 dias
        JSON.stringify({
          userId,
          achievementId,
          unlockedAt,
          points: achievement.points,
        })
      );

      // Adicionar pontos ao usuário
      await this.redis.incr(`user_achievement_points:${userId}`, achievement.points);

      console.log(`✅ Achievement unlocked: ${achievementId} for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error unlocking achievement:', error);
      return false;
    }
  }

  /**
   * Obter achievements desbloqueados do usuário
   */
  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    try {
      const keys = await this.redis.keys(`achievement:${userId}:*`);
      const achievements: UserAchievement[] = [];

      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          achievements.push(JSON.parse(data));
        }
      }

      return achievements.sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime());
    } catch (error) {
      console.error('Error getting user achievements:', error);
      return [];
    }
  }

  /**
   * Obter total de pontos do usuário
   */
  async getUserTotalPoints(userId: string): Promise<number> {
    try {
      const points = await this.redis.get(`user_achievement_points:${userId}`);
      return points ? parseInt(points) : 0;
    } catch (error) {
      console.error('Error getting user total points:', error);
      return 0;
    }
  }

  /**
   * Obter nível do usuário
   */
  async getUserLevel(userId: string): Promise<number> {
    const totalPoints = await this.getUserTotalPoints(userId);
    return calculateLevel(totalPoints);
  }

  /**
   * Obter informações completas do usuário
   */
  async getUserAchievementStats(userId: string): Promise<{
    totalPoints: number;
    level: number;
    badge: string;
    progressToNextLevel: number;
    achievementCount: number;
    achievements: UserAchievement[];
  }> {
    const totalPoints = await this.getUserTotalPoints(userId);
    const level = calculateLevel(totalPoints);
    const badge = getLevelBadge(level);
    const progressToNextLevel = calculateProgressToNextLevel(totalPoints);
    const achievements = await this.getUserAchievements(userId);

    return {
      totalPoints,
      level,
      badge,
      progressToNextLevel,
      achievementCount: achievements.length,
      achievements,
    };
  }

  /**
   * Verificar e desbloquear achievements baseado em critérios
   */
  async checkAndUnlockAchievements(userId: string, data: {
    transactionCount?: number;
    consecutiveDays?: number;
    amountSaved?: number;
    budgetMonthsRespected?: number;
    balance?: number;
    referralCount?: number;
  }): Promise<string[]> {
    const unlockedAchievements: string[] = [];

    // Verificar FIRST_TRANSACTION
    if (data.transactionCount === 1) {
      const unlocked = await this.unlockAchievement(userId, 'first_transaction');
      if (unlocked) unlockedAchievements.push('first_transaction');
    }

    // Verificar FIRST_WEEK
    if (data.consecutiveDays === 7) {
      const unlocked = await this.unlockAchievement(userId, 'first_week');
      if (unlocked) unlockedAchievements.push('first_week');
    }

    // Verificar CONSISTENT_TRACKER
    if (data.consecutiveDays === 30) {
      const unlocked = await this.unlockAchievement(userId, 'consistent_tracker');
      if (unlocked) unlockedAchievements.push('consistent_tracker');
    }

    // Verificar ONE_HUNDRED_TRANSACTIONS
    if (data.transactionCount === 100) {
      const unlocked = await this.unlockAchievement(userId, 'one_hundred_transactions');
      if (unlocked) unlockedAchievements.push('one_hundred_transactions');
    }

    // Verificar SAVER
    if (data.amountSaved && data.amountSaved >= 100) {
      const unlocked = await this.unlockAchievement(userId, 'saver');
      if (unlocked) unlockedAchievements.push('saver');
    }

    // Verificar BIG_SAVER
    if (data.amountSaved && data.amountSaved >= 500) {
      const unlocked = await this.unlockAchievement(userId, 'big_saver');
      if (unlocked) unlockedAchievements.push('big_saver');
    }

    // Verificar EXTREME_SAVER
    if (data.amountSaved && data.amountSaved >= 1000) {
      const unlocked = await this.unlockAchievement(userId, 'extreme_saver');
      if (unlocked) unlockedAchievements.push('extreme_saver');
    }

    // Verificar BUDGET_MASTER
    if (data.budgetMonthsRespected === 3) {
      const unlocked = await this.unlockAchievement(userId, 'budget_master');
      if (unlocked) unlockedAchievements.push('budget_master');
    }

    // Verificar BUDGET_GURU
    if (data.budgetMonthsRespected === 12) {
      const unlocked = await this.unlockAchievement(userId, 'budget_guru');
      if (unlocked) unlockedAchievements.push('budget_guru');
    }

    // Verificar BALANCE_POSITIVE
    if (data.balance && data.balance > 0) {
      const unlocked = await this.unlockAchievement(userId, 'balance_positive');
      if (unlocked) unlockedAchievements.push('balance_positive');
    }

    // Verificar THOUSAND_BALANCE
    if (data.balance && data.balance >= 1000) {
      const unlocked = await this.unlockAchievement(userId, 'thousand_balance');
      if (unlocked) unlockedAchievements.push('thousand_balance');
    }

    // Verificar FIRST_REFERRAL
    if (data.referralCount === 1) {
      const unlocked = await this.unlockAchievement(userId, 'first_referral');
      if (unlocked) unlockedAchievements.push('first_referral');
    }

    // Verificar FIVE_REFERRALS
    if (data.referralCount === 5) {
      const unlocked = await this.unlockAchievement(userId, 'five_referrals');
      if (unlocked) unlockedAchievements.push('five_referrals');
    }

    // Verificar TEN_REFERRALS
    if (data.referralCount === 10) {
      const unlocked = await this.unlockAchievement(userId, 'ten_referrals');
      if (unlocked) unlockedAchievements.push('ten_referrals');
    }

    return unlockedAchievements;
  }

  /**
   * Obter leaderboard global
   */
  async getLeaderboard(limit: number = 10): Promise<Array<{ userId: string; points: number; level: number }>> {
    try {
      const keys = await this.redis.keys('user_achievement_points:*');
      const leaderboard: Array<{ userId: string; points: number; level: number }> = [];

      for (const key of keys) {
        const userId = key.replace('user_achievement_points:', '');
        const points = await this.getUserTotalPoints(userId);
        const level = calculateLevel(points);

        leaderboard.push({ userId, points, level });
      }

      return leaderboard
        .sort((a, b) => b.points - a.points)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }
}

export default AchievementService;
