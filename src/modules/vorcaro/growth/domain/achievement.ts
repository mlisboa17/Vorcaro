export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'tracking' | 'saving' | 'consistency' | 'milestone' | 'special';
  points: number;
  requirement: AchievementRequirement;
  unlockedAt?: Date;
  progress?: number;
}

export interface AchievementRequirement {
  type:
    | 'transaction_count'
    | 'days_consecutive'
    | 'amount_saved'
    | 'category_limit'
    | 'budget_respect'
    | 'referral_count'
    | 'special_action';
  value: number;
}

export const ACHIEVEMENTS: Record<string, Achievement> = {
  // ===== TRACKING =====
  FIRST_TRANSACTION: {
    id: 'first_transaction',
    name: 'Primeira Transação',
    description: 'Registrar a primeira transação',
    icon: '📝',
    category: 'tracking',
    points: 10,
    requirement: { type: 'transaction_count', value: 1 },
  },

  FIRST_WEEK: {
    id: 'first_week',
    name: 'Primeira Semana',
    description: 'Registrar transações por 7 dias seguidos',
    icon: '📅',
    category: 'tracking',
    points: 50,
    requirement: { type: 'days_consecutive', value: 7 },
  },

  CONSISTENT_TRACKER: {
    id: 'consistent_tracker',
    name: 'Rastreador Consistente',
    description: 'Registrar transações por 30 dias seguidos',
    icon: '🔥',
    category: 'consistency',
    points: 100,
    requirement: { type: 'days_consecutive', value: 30 },
  },

  ONE_HUNDRED_TRANSACTIONS: {
    id: 'one_hundred_transactions',
    name: 'Centuplista',
    description: 'Registrar 100 transações',
    icon: '💯',
    category: 'tracking',
    points: 200,
    requirement: { type: 'transaction_count', value: 100 },
  },

  // ===== SAVING =====
  SAVER: {
    id: 'saver',
    name: 'Economizador',
    description: 'Economizar R$ 100 em um mês',
    icon: '💰',
    category: 'saving',
    points: 50,
    requirement: { type: 'amount_saved', value: 100 },
  },

  BIG_SAVER: {
    id: 'big_saver',
    name: 'Grande Economizador',
    description: 'Economizar R$ 500 em um mês',
    icon: '🏦',
    category: 'saving',
    points: 150,
    requirement: { type: 'amount_saved', value: 500 },
  },

  EXTREME_SAVER: {
    id: 'extreme_saver',
    name: 'Extremo Economizador',
    description: 'Economizar R$ 1.000 em um mês',
    icon: '💎',
    category: 'saving',
    points: 300,
    requirement: { type: 'amount_saved', value: 1000 },
  },

  // ===== BUDGET =====
  BUDGET_MASTER: {
    id: 'budget_master',
    name: 'Mestre do Orçamento',
    description: 'Ficar dentro do orçamento por 3 meses',
    icon: '📊',
    category: 'budget_respect',
    points: 200,
    requirement: { type: 'budget_respect', value: 3 },
  },

  BUDGET_GURU: {
    id: 'budget_guru',
    name: 'Guru do Orçamento',
    description: 'Ficar dentro do orçamento por 12 meses',
    icon: '🧘',
    category: 'budget_respect',
    points: 500,
    requirement: { type: 'budget_respect', value: 12 },
  },

  // ===== MILESTONES =====
  BALANCE_POSITIVE: {
    id: 'balance_positive',
    name: 'Saldo Positivo',
    description: 'Ter saldo positivo por 1 mês',
    icon: '📈',
    category: 'milestone',
    points: 75,
    requirement: { type: 'special_action', value: 1 },
  },

  THOUSAND_BALANCE: {
    id: 'thousand_balance',
    name: 'Mil Reais',
    description: 'Atingir saldo de R$ 1.000',
    icon: '🎯',
    category: 'milestone',
    points: 150,
    requirement: { type: 'special_action', value: 1000 },
  },

  // ===== REFERRAL =====
  FIRST_REFERRAL: {
    id: 'first_referral',
    name: 'Embaixador',
    description: 'Convidar o primeiro amigo',
    icon: '👥',
    category: 'special',
    points: 50,
    requirement: { type: 'referral_count', value: 1 },
  },

  FIVE_REFERRALS: {
    id: 'five_referrals',
    name: 'Influenciador',
    description: 'Convidar 5 amigos',
    icon: '🌟',
    category: 'special',
    points: 200,
    requirement: { type: 'referral_count', value: 5 },
  },

  TEN_REFERRALS: {
    id: 'ten_referrals',
    name: 'Superstar',
    description: 'Convidar 10 amigos',
    icon: '⭐',
    category: 'special',
    points: 500,
    requirement: { type: 'referral_count', value: 10 },
  },

  // ===== SPECIAL =====
  EARLY_ADOPTER: {
    id: 'early_adopter',
    name: 'Pioneiro',
    description: 'Estar entre os primeiros 1000 usuários',
    icon: '🚀',
    category: 'special',
    points: 1000,
    requirement: { type: 'special_action', value: 1 },
  },

  PERFECT_WEEK: {
    id: 'perfect_week',
    name: 'Semana Perfeita',
    description: 'Registrar todas as despesas de uma semana',
    icon: '✨',
    category: 'tracking',
    points: 100,
    requirement: { type: 'special_action', value: 1 },
  },

  SOCIAL_BUTTERFLY: {
    id: 'social_butterfly',
    name: 'Borboleta Social',
    description: 'Compartilhar insight 5 vezes',
    icon: '🦋',
    category: 'special',
    points: 75,
    requirement: { type: 'special_action', value: 5 },
  },
};

export interface UserAchievement {
  userId: string;
  achievementId: string;
  unlockedAt: Date;
  points: number;
}

export const calculateLevel = (totalPoints: number): number => {
  return Math.floor(totalPoints / 100) + 1;
};

export const calculateProgressToNextLevel = (totalPoints: number): number => {
  const currentLevel = calculateLevel(totalPoints);
  const pointsForCurrentLevel = (currentLevel - 1) * 100;
  const pointsForNextLevel = currentLevel * 100;
  const pointsProgress = totalPoints - pointsForCurrentLevel;
  const pointsNeeded = pointsForNextLevel - pointsForCurrentLevel;

  return Math.round((pointsProgress / pointsNeeded) * 100);
};

export const getLevelBadge = (level: number): string => {
  if (level <= 1) return '🥚';
  if (level <= 5) return '🐣';
  if (level <= 10) return '🐔';
  if (level <= 20) return '🦅';
  if (level <= 50) return '🐉';
  return '👑';
};
