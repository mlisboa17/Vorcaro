export interface ReferralCode {
  code: string;
  userId: string;
  createdAt: Date;
  validUntil: Date;
  usedCount: number;
  rewards: number; // Total de prêmios ganhos
}

export interface ReferralReward {
  referrerId: string;
  referredUserId: string;
  rewardType: 'cash' | 'points';
  amount: number;
  createdAt: Date;
  status: 'pending' | 'completed' | 'cancelled';
}

export interface ReferralStats {
  referralCode: string;
  totalReferred: number;
  totalRewards: number;
  rewardsPending: number;
  rewardsCompleted: number;
}

export class ReferralProgram {
  // Configuração do programa de referência
  static readonly REFERRER_REWARD = {
    cash: 10, // R$ 10 por referência confirmada
    points: 100, // 100 pontos
  };

  static readonly REFERRER_BONUS = {
    at5Referrals: { cash: 50, points: 500 }, // Bônus ao atingir 5 referências
    at10Referrals: { cash: 100, points: 1000 }, // Bônus ao atingir 10 referências
  };

  static readonly REFERRED_REWARD = {
    cash: 5, // R$ 5 para usuário novo
    points: 50, // 50 pontos
  };

  /**
   * Gerar código de referência único
   */
  static generateReferralCode(userId: string): string {
    // Formato: VORCARO_USERID_RANDOMSTRING
    const userPart = userId.slice(0, 4).toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = `VORCARO_${userPart}_${randomPart}`;
    return code;
  }

  /**
   * Validar formato de código de referência
   */
  static isValidReferralCode(code: string): boolean {
    return /^VORCARO_[A-Z0-9]{4}_[A-Z0-9]{6}$/.test(code);
  }

  /**
   * Calcular bônus para referrer
   */
  static calculateReferrerBonus(referralCount: number): { cash: number; points: number } {
    let cash = 0;
    let points = 0;

    if (referralCount === 5) {
      cash += this.REFERRER_BONUS.at5Referrals.cash;
      points += this.REFERRER_BONUS.at5Referrals.points;
    }

    if (referralCount === 10) {
      cash += this.REFERRER_BONUS.at10Referrals.cash;
      points += this.REFERRER_BONUS.at10Referrals.points;
    }

    return { cash, points };
  }

  /**
   * Obter mensagem compartilhável
   */
  static getShareMessage(userFirstName: string, referralCode: string): string {
    return `Hey! 👋 Venho usando o Vorcaro pra organizar minhas finanças e amei! 💰

Use meu código ${referralCode} e ganhe R$ 5 de bônus ao se cadastrar.

Vorcaro: Seu companheiro financeiro inteligente 🚀
https://vorcaro.app/ref/${referralCode}`;
  }

  /**
   * Obter link de referência
   */
  static getReferralLink(referralCode: string): string {
    return `https://vorcaro.app/ref/${referralCode}`;
  }
}

export const REFERRAL_TIERS = {
  TIER_1: {
    name: 'Embaixador',
    requiredReferrals: 1,
    bonus: { cash: 0, points: 50 },
    badge: '👥',
  },
  TIER_2: {
    name: 'Influenciador',
    requiredReferrals: 5,
    bonus: { cash: 50, points: 500 },
    badge: '🌟',
  },
  TIER_3: {
    name: 'Superstar',
    requiredReferrals: 10,
    bonus: { cash: 100, points: 1000 },
    badge: '⭐',
  },
  TIER_4: {
    name: 'Lenda',
    requiredReferrals: 25,
    bonus: { cash: 250, points: 2500 },
    badge: '👑',
  },
};

export function getUserReferralTier(referralCount: number): (typeof REFERRAL_TIERS)[keyof typeof REFERRAL_TIERS] {
  if (referralCount >= 25) return REFERRAL_TIERS.TIER_4;
  if (referralCount >= 10) return REFERRAL_TIERS.TIER_3;
  if (referralCount >= 5) return REFERRAL_TIERS.TIER_2;
  return REFERRAL_TIERS.TIER_1;
}

/**
 * Validar elegibilidade para referência
 * Um usuário pode:
 * - Referir quantas pessoas quiser
 * - Não pode referir a si mesmo
 * - Cada usuário novo só pode ser referido UMA vez
 */
export function validateReferral(referrerId: string, referredUserId: string, referralCode: string): {
  isValid: boolean;
  error?: string;
} {
  // Validar código
  if (!ReferralProgram.isValidReferralCode(referralCode)) {
    return { isValid: false, error: 'Código de referência inválido' };
  }

  // Não pode se referir a si mesmo
  if (referrerId === referredUserId) {
    return { isValid: false, error: 'Não pode referir a si mesmo' };
  }

  return { isValid: true };
}
